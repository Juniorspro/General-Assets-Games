package ai.rezona.aero;

import android.app.Activity;
import android.app.role.RoleManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Lo único que el WebView no puede hacer solo.
 *
 * ── LOS ICONOS NO PASAN POR ACÁ ──
 * Cien apps a un PNG de 128 px son millón y medio de bytes de base64 cruzando el
 * puente en una sola llamada, en el hilo principal, antes del primer cuadro.
 * Van por `shouldInterceptRequest` (ver ClienteIconos): la página pide
 * `<img src="https://icono.aero/com.lo.que.sea">`, el WebView pregunta, y el PNG
 * se decodifica en el hilo de red del propio WebView y queda en su caché.
 */
public class Puente {

  private final Activity act;
  private final WebView web;
  private String insetArriba = "0", insetAbajo = "0";
  /* el alto del teclado, en dp. Va aparte de los insets porque cambia muchas
     veces por segundo mientras el teclado sube y los otros dos casi nunca. */
  private String altoTeclado = "0";

  public Puente(Activity a, WebView w) { this.act = a; this.web = w; }

  void insets(int arriba, int abajo) {
    insetArriba = String.valueOf(arriba);
    insetAbajo = String.valueOf(abajo);
    web.post(() -> web.evaluateJavascript(
        "window.__insets && __insets(" + insetArriba + "," + insetAbajo + ")", null));
  }

  @JavascriptInterface public String insets() { return insetArriba + "," + insetAbajo; }

  /* ── EL TECLADO NO SE PUEDE MEDIR DESDE LA PÁGINA ──
     La ventana está en modo `setDecorFitsSystemWindows(false)`, o sea de borde a
     borde: con eso `adjustResize` NO encoge el WebView —el teclado llega como un
     inset— así que ni `innerHeight` ni `visualViewport` cambian y desde
     JavaScript el teclado es invisible. El único que lo sabe es el sistema. */
  void teclado(int alto) {
    String n = String.valueOf(alto);
    if (n.equals(altoTeclado)) return;   /* dispara en cada cuadro de la animación */
    altoTeclado = n;
    web.post(() -> web.evaluateJavascript("window.__teclado && __teclado(" + n + ")", null));
  }

  @JavascriptInterface public String teclado() { return altoTeclado; }

  /* ══════════ LA LISTA DE APPS ══════════ */
  @JavascriptInterface public String apps() {
    PackageManager pm = act.getPackageManager();
    Intent i = new Intent(Intent.ACTION_MAIN, null);
    i.addCategory(Intent.CATEGORY_LAUNCHER);
    List<ResolveInfo> r = pm.queryIntentActivities(i, 0);

    List<String[]> v = new ArrayList<>();
    for (ResolveInfo ri : r) {
      String p = ri.activityInfo.applicationInfo.packageName;
      /* el propio launcher no se lista: tocarlo no lleva a ninguna parte */
      if (act.getPackageName().equals(p)) continue;
      CharSequence lab = ri.loadLabel(pm);
      String n = lab == null ? p : lab.toString();
      boolean sis = (ri.activityInfo.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
      v.add(new String[]{ p, n, sis ? "1" : "0" });
    }
    /* alfabético y sin distinguir mayúsculas ni acentos: es como se busca con el
       dedo, no como ordena el sistema de archivos */
    Collections.sort(v, (a, b) -> quita(a[1]).compareTo(quita(b[1])));

    StringBuilder sb = new StringBuilder("[");
    for (int k = 0; k < v.size(); k++) {
      if (k > 0) sb.append(',');
      sb.append("{\"p\":\"").append(esc(v.get(k)[0])).append("\",\"n\":\"")
        .append(esc(v.get(k)[1])).append("\",\"s\":").append(v.get(k)[2]).append('}');
    }
    return sb.append(']').toString();
  }

  private static String quita(String s) {
    String x = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "");
    return x.toLowerCase();
  }
  private static String esc(String s) {
    StringBuilder b = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"' || c == '\\') b.append('\\').append(c);
      else if (c == '\n' || c == '\r' || c == '\t') b.append(' ');
      else if (c < 0x20) b.append(' ');
      else b.append(c);
    }
    return b.toString();
  }

  /* ══════════ LANZAR ══════════ */
  @JavascriptInterface public boolean abrir(String pkg) {
    try {
      Intent i = act.getPackageManager().getLaunchIntentForPackage(pkg);
      if (i == null) return false;
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
      act.startActivity(i);
      return true;
    } catch (Exception e) { return false; }
  }

  @JavascriptInterface public void info(String pkg) {
    try {
      act.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          Uri.parse("package:" + pkg)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    } catch (Exception e) {}
  }

  @JavascriptInterface public void borrar(String pkg) {
    try {
      act.startActivity(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + pkg))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    } catch (Exception e) {}
  }

  @JavascriptInterface public void ajustes() {
    try {
      act.startActivity(new Intent(Settings.ACTION_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    } catch (Exception e) {}
  }

  /* ── PARA CAMBIAR DE LAUNCHER HAY QUE PODER LLEGAR A LA PANTALLA ──
     Sin esto, alguien que se arrepiente tiene que ir a buscar el ajuste a mano
     por un menú que en cada teléfono está en otro lado. */
  @JavascriptInterface public void elegirInicio() {
    try {
      act.startActivity(new Intent(Settings.ACTION_HOME_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    } catch (Exception e) { ajustes(); }
  }

  /* ══════════ SER —O DEJAR DE SER— LA PANTALLA DE INICIO ══════════

     ── EL PUESTO ES UN COMPONENTE, ASÍ QUE SE PUEDE APAGAR ──
     `.Inicio` es un alias de `.Principal` que lleva la categoría HOME y nada
     más (ver el manifiesto). Apagándolo con `setComponentEnabledSetting`,
     Android deja de tener a Aero entre los candidatos y se va al que quede —
     si queda uno solo, sin preguntar. No hace falta ningún permiso: es un
     componente propio.

     ── Y NO SE PUEDE DEJAR AL TELÉFONO SIN NINGUNO ──
     Si Aero fuera el único, apagarlo dejaría el aparato sin pantalla de inicio
     y apretar HOME no llevaría a ninguna parte. Se cuenta antes. */
  private ComponentName aliasInicio() {
    return new ComponentName(act, act.getPackageName() + ".Inicio");
  }

  private void alias(boolean on) {
    act.getPackageManager().setComponentEnabledSetting(aliasInicio(),
        on ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
           : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
        PackageManager.DONT_KILL_APP);
  }

  /* cuántos OTROS paquetes se ofrecen como pantalla de inicio. Se cuentan
     paquetes y no actividades —un launcher puede declarar varias— y se saltea
     `android`, que es la pantalla de «elegí con cuál» del propio sistema y no
     un launcher. */
  private int otrosInicios() {
    try {
      PackageManager pm = act.getPackageManager();
      Intent h = new Intent(Intent.ACTION_MAIN);
      h.addCategory(Intent.CATEGORY_HOME);
      List<String> v = new ArrayList<>();
      for (ResolveInfo ri : pm.queryIntentActivities(h, 0)) {
        String p = ri.activityInfo.applicationInfo.packageName;
        if (act.getPackageName().equals(p) || "android".equals(p)) continue;
        if (!v.contains(p)) v.add(p);
      }
      return v.size();
    } catch (Exception e) { return 0; }
  }

  @JavascriptInterface public String inicio() {
    boolean soy = false, ofrece = true;
    int otros = 0;
    try {
      PackageManager pm = act.getPackageManager();
      Intent h = new Intent(Intent.ACTION_MAIN);
      h.addCategory(Intent.CATEGORY_HOME);
      ResolveInfo r = pm.resolveActivity(h, PackageManager.MATCH_DEFAULT_ONLY);
      soy = r != null && r.activityInfo != null
            && act.getPackageName().equals(r.activityInfo.applicationInfo.packageName);
      otros = otrosInicios();
      ofrece = pm.getComponentEnabledSetting(aliasInicio())
               != PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
    } catch (Exception e) {}
    return "{\"soy\":" + soy + ",\"otros\":" + otros + ",\"ofrece\":" + ofrece + "}";
  }

  /* ── PONERLO ES UNA SOLA PREGUNTA DEL SISTEMA, NO UN PASEO POR AJUSTES ──
     Desde Android 10 el rol HOME se pide con un diálogo de un toque. Antes de
     eso —y en el aparato donde el rol no esté disponible— queda la pantalla de
     ajustes, que es lo que había. Y primero se vuelve a encender el alias: sin
     componente HOME no hay nada que elegir. */
  @JavascriptInterface public boolean ponerInicio() {
    try { alias(true); } catch (Exception e) {}
    if (Build.VERSION.SDK_INT >= 29) {
      try {
        RoleManager rm = (RoleManager) act.getSystemService(Context.ROLE_SERVICE);
        if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME)) {
          Intent i = rm.createRequestRoleIntent(RoleManager.ROLE_HOME);
          if (i.resolveActivity(act.getPackageManager()) != null) {
            act.startActivityForResult(i, 7001);
            return true;
          }
        }
      } catch (Exception e) {}
    }
    elegirInicio();
    return false;
  }

  @JavascriptInterface public boolean salirInicio() {
    if (otrosInicios() < 1) return false;   /* dejaría el teléfono sin inicio */
    try {
      alias(false);
      Intent h = new Intent(Intent.ACTION_MAIN);
      h.addCategory(Intent.CATEGORY_HOME);
      h.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      act.startActivity(h);
      return true;
    } catch (Exception e) { return false; }
  }

  @JavascriptInterface public void buscarWeb(String q) {
    try {
      Intent i = new Intent(Intent.ACTION_WEB_SEARCH);
      i.putExtra(android.app.SearchManager.QUERY, q);
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      act.startActivity(i);
    } catch (Exception e) {
      try {
        act.startActivity(new Intent(Intent.ACTION_VIEW,
            Uri.parse("https://www.google.com/search?q=" + Uri.encode(q)))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
      } catch (Exception x) {}
    }
  }

  @JavascriptInterface public void web(String url) {
    try {
      act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    } catch (Exception e) {}
  }

  /* ══════════ ESTADO DEL APARATO ══════════ */
  @JavascriptInterface public String bateria() {
    try {
      Intent b = act.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
      if (b == null) return "{\"n\":-1,\"c\":false}";
      int niv = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
      int esc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
      int est = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
      boolean carga = est == BatteryManager.BATTERY_STATUS_CHARGING
                   || est == BatteryManager.BATTERY_STATUS_FULL;
      int pct = (niv < 0 || esc <= 0) ? -1 : Math.round(niv*100f/esc);
      return "{\"n\":" + pct + ",\"c\":" + carga + "}";
    } catch (Exception e) { return "{\"n\":-1,\"c\":false}"; }
  }

  /* ── EL PULSO ES CORTO Y SE PIDE, NO SE SUPONE ──
     Un launcher que vibra fuerte en cada toque se apaga a los diez minutos. */
  @JavascriptInterface public void vibra(int ms) {
    try {
      Vibrator v = (Vibrator) act.getSystemService(Context.VIBRATOR_SERVICE);
      if (v == null || !v.hasVibrator()) return;
      int d = Math.max(1, Math.min(60, ms));
      if (Build.VERSION.SDK_INT >= 26)
        v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
      else v.vibrate(d);
    } catch (Exception e) {}
  }

  /* ══════════ EL ICONO, COMO BYTES ══════════
     Lo llama el cliente del WebView, no el JavaScript. */
  byte[] iconoPng(String pkg, int lado) {
    try {
      PackageManager pm = act.getPackageManager();
      Drawable d = pm.getApplicationIcon(pkg);
      /* ── SIEMPRE SE DIBUJA EN UN BITMAP PROPIO ──
         El atajo sería `createScaledBitmap` sobre el bitmap del BitmapDrawable,
         y tiene una trampa: cuando el tamaño ya coincide, esa función devuelve
         **el mismo objeto**, así que el `recycle()` de abajo destruiría el
         bitmap que el PackageManager tiene cacheado — y a partir de ahí el
         icono de esa app no se dibuja más en NINGÚN lado del sistema.
         Dibujando siempre en uno nuevo no hay nada compartido que reciclar, y
         de paso el camino es uno solo: un adaptive icon no tiene bitmap y hay
         que pedirle que se pinte igual (con sus bounds, o sale un rectángulo
         de cero por cero). */
      Bitmap bm = Bitmap.createBitmap(lado, lado, Bitmap.Config.ARGB_8888);
      Canvas c = new Canvas(bm);
      d.setBounds(0, 0, lado, lado);
      d.draw(c);
      ByteArrayOutputStream o = new ByteArrayOutputStream();
      bm.compress(Bitmap.CompressFormat.PNG, 100, o);
      bm.recycle();
      return o.toByteArray();
    } catch (Exception e) { return null; }
  }

  /* ══════════════════ LA CÁMARA ══════════════════ */

  /** ¿está el permiso del sistema puesto? La página lo pregunta ANTES de
      llamar a `getUserMedia`: preguntar primero deja mostrar el cartel de
      «tocá para permitir» en vez de una pantalla negra con un error. */
  @JavascriptInterface public boolean camaraOk() {
    return (act instanceof Principal) && ((Principal) act).tieneCamara();
  }

  @JavascriptInterface public void camaraPide() {
    if (act instanceof Principal) ((Principal) act).pideCamara();
  }

  /**
   * ── LA OTRA MITAD DEL SELECTOR ──
   * El pedido fue que abrir la cámara NO abra la normal sino que deje elegir.
   * La elección la muestra el launcher; este método es el otro botón, y va por
   * el intent estándar de foto fija para que Android abra la cámara que el
   * dueño tenga puesta —la del fabricante, GCam, la que sea— en vez de que el
   * launcher adivine un paquete.
   *
   * `NEW_TASK` porque el launcher es `singleTask`: sin él la cámara se abriría
   * DENTRO de nuestra tarea y apretar HOME la dejaría encima del escritorio.
   */
  @JavascriptInterface public boolean camaraSistema() {
    try {
      Intent i = new Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA);
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      act.startActivity(i);
      return true;
    } catch (Exception e) {
      try {
        Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        act.startActivity(i);
        return true;
      } catch (Exception e2) { return false; }
    }
  }

  /* ══════════════════════ EL CENTRO DE CONTROL ══════════════════════
   *
   * ── UN INTERRUPTOR O HACE LA COSA O ABRE DONDE SE HACE, Y SE VE DISTINTO ──
   * Desde Android 10 una app normal NO puede prender el wifi, los datos ni el
   * bluetooth: `setWifiEnabled` devuelve false y no falla. Un interruptor que
   * finge que prendió algo y no prendió nada es peor que no tenerlo, así que
   * los que no se pueden hacer ABREN el panel del sistema donde sí se hacen, y
   * el launcher los dibuja como atajos y no como llaves.
   *
   * Lo que sí se hace de verdad desde acá: la linterna (`setTorchMode`, sin
   * ningún permiso desde API 23), el volumen (`AudioManager`) y el brillo.
   */
  @JavascriptInterface public String estadoSis() {
    StringBuilder b = new StringBuilder("{");
    try {
      AudioManager am = (AudioManager) act.getSystemService(Context.AUDIO_SERVICE);
      int mx = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
      int v = am.getStreamVolume(AudioManager.STREAM_MUSIC);
      b.append("\"vol\":").append(mx > 0 ? (float) v / mx : 0f).append(',');
    } catch (Exception e) { b.append("\"vol\":0.5,"); }
    try {
      /* 0..255 en Settings.System: se normaliza acá para que el launcher no
         tenga que saber la escala de Android */
      int br = Settings.System.getInt(act.getContentResolver(),
                                      Settings.System.SCREEN_BRIGHTNESS, 128);
      b.append("\"brillo\":").append(br / 255f).append(',');
    } catch (Exception e) { b.append("\"brillo\":0.5,"); }
    b.append("\"linterna\":").append(torch).append(',');
    try {
      b.append("\"avion\":").append(Settings.Global.getInt(act.getContentResolver(),
          Settings.Global.AIRPLANE_MODE_ON, 0) == 1).append(',');
    } catch (Exception e) { b.append("\"avion\":false,"); }
    try {
      b.append("\"rotar\":").append(Settings.System.getInt(act.getContentResolver(),
          Settings.System.ACCELEROMETER_ROTATION, 0) == 1);
    } catch (Exception e) { b.append("\"rotar\":false"); }
    return b.append('}').toString();
  }

  private boolean torch = false;

  @JavascriptInterface public boolean linterna(boolean on) {
    try {
      CameraManager cm = (CameraManager) act.getSystemService(Context.CAMERA_SERVICE);
      String[] ids = cm.getCameraIdList();
      for (int i = 0; i < ids.length; i++) {
        Boolean tiene = cm.getCameraCharacteristics(ids[i])
                          .get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
        if (tiene != null && tiene) {
          cm.setTorchMode(ids[i], on);
          torch = on;
          return true;
        }
      }
    } catch (Exception e) { }
    return false;
  }

  @JavascriptInterface public boolean volumen(double k) {
    try {
      AudioManager am = (AudioManager) act.getSystemService(Context.AUDIO_SERVICE);
      int mx = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
      int v = (int) Math.round(Math.max(0, Math.min(1, k)) * mx);
      am.setStreamVolume(AudioManager.STREAM_MUSIC, v, 0);
      return true;
    } catch (Exception e) { return false; }
  }

  /* ── EL BRILLO DE LA VENTANA SIEMPRE SE PUEDE; EL DEL SISTEMA NO ──
   * Cambiar el brillo del sistema pide `WRITE_SETTINGS`, que es un permiso que
   * concede el dueño en una pantalla aparte. Sin él, lo que sí se puede es el
   * brillo de NUESTRA ventana, que es lo que el dedo ve moverse mientras el
   * centro de control está abierto. Devuelve cuál de los dos hizo, para que el
   * launcher no diga que cambió el brillo del teléfono cuando cambió el suyo. */
  @JavascriptInterface public String brillo(double k) {
    float v = (float) Math.max(0.01, Math.min(1, k));
    boolean sis = false;
    try {
      if (Build.VERSION.SDK_INT < 23 || Settings.System.canWrite(act)) {
        Settings.System.putInt(act.getContentResolver(),
            Settings.System.SCREEN_BRIGHTNESS_MODE,
            Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
        Settings.System.putInt(act.getContentResolver(),
            Settings.System.SCREEN_BRIGHTNESS, Math.round(v * 255));
        sis = true;
      }
    } catch (Exception e) { }
    try {
      android.view.WindowManager.LayoutParams lp = act.getWindow().getAttributes();
      lp.screenBrightness = v;
      act.getWindow().setAttributes(lp);
    } catch (Exception e) { }
    return "{\"sistema\":" + sis + "}";
  }

  /* abre el panel del sistema que corresponde. Un nombre y no un intent crudo:
     así el launcher pide «wifi» y este lado sabe que en API 29+ eso es un panel
     deslizante y antes era una pantalla entera. */
  @JavascriptInterface public boolean panel(String que) {
    String a = null;
    if ("wifi".equals(que)) a = Build.VERSION.SDK_INT >= 29
        ? Settings.Panel.ACTION_WIFI : Settings.ACTION_WIFI_SETTINGS;
    else if ("datos".equals(que)) a = Build.VERSION.SDK_INT >= 29
        ? Settings.Panel.ACTION_INTERNET_CONNECTIVITY : Settings.ACTION_DATA_ROAMING_SETTINGS;
    else if ("volumen".equals(que)) a = Build.VERSION.SDK_INT >= 29
        ? Settings.Panel.ACTION_VOLUME : Settings.ACTION_SOUND_SETTINGS;
    else if ("bt".equals(que)) a = Settings.ACTION_BLUETOOTH_SETTINGS;
    else if ("avion".equals(que)) a = Settings.ACTION_AIRPLANE_MODE_SETTINGS;
    else if ("rotar".equals(que)) a = Settings.ACTION_DISPLAY_SETTINGS;
    else if ("nfc".equals(que)) a = Settings.ACTION_NFC_SETTINGS;
    else if ("dnd".equals(que)) a = Settings.ACTION_SOUND_SETTINGS;
    else if ("bateria".equals(que)) a = Settings.ACTION_BATTERY_SAVER_SETTINGS;
    else if ("ubicacion".equals(que)) a = Settings.ACTION_LOCATION_SOURCE_SETTINGS;
    else if ("brillo".equals(que)) a = Settings.ACTION_DISPLAY_SETTINGS;
    else if ("permBrillo".equals(que)) a = Settings.ACTION_MANAGE_WRITE_SETTINGS;
    else a = Settings.ACTION_SETTINGS;
    try {
      Intent i = new Intent(a);
      if ("permBrillo".equals(que)) i.setData(Uri.parse("package:" + act.getPackageName()));
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      act.startActivity(i);
      return true;
    } catch (Exception e) { return false; }
  }

  @JavascriptInterface public String version() {
    return "{\"sdk\":" + Build.VERSION.SDK_INT + ",\"modelo\":\"" + esc(Build.MODEL) + "\"}";
  }
}
