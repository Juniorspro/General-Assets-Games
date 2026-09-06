#!/usr/bin/env bash
# ══════════════════════ APK SIN GRADLE ══════════════════════
#
# Gradle acá no aporta nada: no hay dependencias, no hay variantes y no hay
# recursos generados. Lo que sí aporta es bajar medio giga de artefactos y un
# demonio. Las cuatro herramientas del SDK hacen exactamente lo mismo:
#
#   aapt2 compile  →  cada recurso a .flat
#   aapt2 link     →  el APK "base" con el manifiesto, los recursos y R.java
#   javac + d8     →  el .java a classes.dex
#   zipalign       →  alinea el zip (obligatorio ANTES de firmar con apksigner)
#   apksigner      →  la firma v1+v2+v3
#
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK="${ANDROID_SDK:-/opt/asdk}"
BT="$SDK/build-tools/34.0.0"
PLAT="$SDK/platforms/android-34/android.jar"
APP="$AQUI/app"
OUT="$AQUI/salida"
NOM="Aero.apk"

for f in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$PLAT"; do
  [ -e "$f" ] || { echo "falta: $f"; exit 1; }
done
command -v javac >/dev/null || { echo "falta javac"; exit 1; }

# ── 0. la interfaz se arma SIEMPRE ──
# El HTML de `assets/` es una salida, no una fuente: compilar sin rearmarlo es
# empaquetar la versión anterior sin que nada avise.
python3 "$AQUI/armar.py"
python3 "$AQUI/icono.py" >/dev/null

rm -rf "$OUT"; mkdir -p "$OUT/flat" "$OUT/gen" "$OUT/clases"

echo "── recursos"
"$BT/aapt2" compile --dir "$APP/res" -o "$OUT/flat/res.zip"

echo "── enlace"
"$BT/aapt2" link \
  -o "$OUT/base.apk" \
  -I "$PLAT" \
  --manifest "$APP/AndroidManifest.xml" \
  -A "$APP/assets" \
  --java "$OUT/gen" \
  --min-sdk-version 26 \
  --target-sdk-version 34 \
  --version-code 1 --version-name "1.0" \
  "$OUT/flat/res.zip"

echo "── java"
# `--release 17` fija el nivel del bytecode Y la API del JDK que se puede usar,
# que es lo que d8 necesita; `android.jar` va por `-classpath` y no por
# `-bootclasspath`, porque un JDK moderno rechaza mezclar `-bootclasspath` con
# `-source/-target` («option --boot-class-path not allowed with target 17»).
# El `set -o pipefail` de arriba haría pasar por alto un error de javac si el
# `|| true` se comiera el estado, así que se comprueba a mano.
javac -nowarn --release 17 \
  -classpath "$PLAT" \
  -d "$OUT/clases" \
  $(find "$APP/java" "$OUT/gen" -name '*.java')
[ -n "$(find "$OUT/clases" -name '*.class' -print -quit)" ] || { echo "javac no dejó clases"; exit 1; }

echo "── dex"
"$BT/d8" --release --min-api 26 --lib "$PLAT" \
  --output "$OUT" $(find "$OUT/clases" -name '*.class')

echo "── empaquetado"
cd "$OUT"
cp base.apk sin_firma.apk
# `zip -j` mete el dex en la raíz del APK, que es donde va
zip -q -j sin_firma.apk classes.dex

echo "── alineado"
"$BT/zipalign" -p -f 4 sin_firma.apk alineado.apk

echo "── firma"
# Una llave de depuración: esto no va a Play, se instala de costado. Se genera
# una sola vez y se queda, así que actualizar la app encima de la anterior no
# pide desinstalarla — cambiar de llave entre versiones sí lo pediría.
LL="$AQUI/llave.jks"
if [ ! -f "$LL" ]; then
  keytool -genkeypair -v -keystore "$LL" -storepass aero1234 -keypass aero1234 \
    -alias aero -keyalg RSA -keysize 2048 -validity 10950 \
    -dname "CN=Aero, OU=Rezona, O=Rezona, L=BA, S=BA, C=AR" >/dev/null 2>&1
  echo "   llave nueva: $(basename "$LL")"
fi
"$BT/apksigner" sign --ks "$LL" --ks-pass pass:aero1234 --key-pass pass:aero1234 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT/$NOM" alineado.apk
"$BT/apksigner" verify --print-certs "$OUT/$NOM" >/dev/null

rm -f base.apk sin_firma.apk alineado.apk classes.dex "$OUT/$NOM.idsig"
rm -rf flat gen clases

echo
echo "✔ $OUT/$NOM  ($(du -h "$OUT/$NOM" | cut -f1))"
"$BT/aapt2" dump badging "$OUT/$NOM" | grep -E "^package|launchable|sdkVersion|application-label:" || true
