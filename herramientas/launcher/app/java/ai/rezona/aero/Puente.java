package ai.rezona.aero;

import android.app.Activity;
import android.app.AppOpsManager;
import android.app.role.RoleManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.LauncherApps;
import android.content.pm.ResolveInfo;
import android.content.pm.ShortcutInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Process;
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

  /* ══════════ LOS ATAJOS DE UNA APP ══════════
   * Mantener WhatsApp y que salgan «Chat nuevo» o «Cámara». Es lo más visible
   * que le falta a un launcher que no los tiene, y es una API que Android le da
   * SÓLO al que es la pantalla de inicio por omisión: `hasShortcutHostPermission`
   * devuelve false para cualquier otra app, y `getShortcuts` tira SecurityException.
   *
   * Por eso las tres preguntas están separadas y `atajosOk()` existe: sin ella,
   * «esta app no tiene atajos» y «no somos el launcher» se ven exactamente igual
   * desde la interfaz, y son dos cosas que se arreglan de maneras opuestas.
   *
   * Los tres tipos se piden juntos —dinámicos, los del manifiesto y los que el
   * dueño clavó— porque para quien mantiene el icono son la misma lista; el que
   * los separa es el sistema, no la persona. */
  private LauncherApps la() {
    try { return (LauncherApps) act.getSystemService(Context.LAUNCHER_APPS_SERVICE); }
    catch (Exception e) { return null; }
  }

  @JavascriptInterface public boolean atajosOk() {
    if (Build.VERSION.SDK_INT < 25) return false;
    LauncherApps l = la();
    try { return l != null && l.hasShortcutHostPermission(); }
    catch (Exception e) { return false; }
  }

  @JavascriptInterface public String atajos(String pkg) {
    if (Build.VERSION.SDK_INT < 25 || pkg == null) return "[]";
    LauncherApps l = la();
    if (l == null) return "[]";
    try {
      if (!l.hasShortcutHostPermission()) return "[]";
      LauncherApps.ShortcutQuery q = new LauncherApps.ShortcutQuery();
      q.setPackage(pkg);
      q.setQueryFlags(LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC
                    | LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST
                    | LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED);
      List<ShortcutInfo> v = l.getShortcuts(q, Process.myUserHandle());
      if (v == null) return "[]";
      /* el rango es el orden en que la app quiere que se lean, y los del
         manifiesto no lo traen: los que no lo declaran van al final en el orden
         en que vinieron, que es mejor que barajarlos */
      Collections.sort(v, (x, y) -> Integer.compare(x.getRank(), y.getRank()));
      StringBuilder sb = new StringBuilder("[");
      int n = 0;
      for (ShortcutInfo si : v) {
        if (si == null || !si.isEnabled()) continue;
        CharSequence c = si.getShortLabel();
        CharSequence g = si.getLongLabel();
        /* el corto es el que entra en una fila; el largo sólo si el corto vino
           vacío, que pasa con algunos atajos del manifiesto */
        String t = c != null && c.length() > 0 ? c.toString()
                 : (g != null ? g.toString() : null);
        if (t == null || t.trim().isEmpty()) continue;
        if (n > 0) sb.append(',');
        sb.append("{\"i\":\"").append(esc(si.getId()))
          .append("\",\"t\":\"").append(esc(t)).append("\"}");
        if (++n >= 6) break;   /* seis filas es lo que entra sin scrollear */
      }
      return sb.append(']').toString();
    } catch (Exception e) { return "[]"; }
  }

  @JavascriptInterface public boolean atajoAbrir(String pkg, String id) {
    if (Build.VERSION.SDK_INT < 25 || pkg == null || id == null) return false;
    LauncherApps l = la();
    if (l == null) return false;
    try {
      l.startShortcut(pkg, id, null, null, Process.myUserHandle());
      return true;
    } catch (Exception e) { return false; }
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

  /* ══════════ LAS NOTIFICACIONES ══════════
   * El servicio es `Escucha`; acá está sólo la puerta. Y `notiOk` se pregunta
   * de DOS formas y no de una: `Escucha.conectada()` dice si el servicio está
   * vivo AHORA, y la lista del sistema dice si el dueño nos habilitó — un
   * servicio habilitado pero todavía no enlazado devuelve false en la primera y
   * true en la segunda, y en ese caso lo que corresponde es esperar, no pedirle
   * el permiso otra vez a alguien que ya lo dio. */
  @JavascriptInterface public boolean notiOk() { return Escucha.conectada(); }

  @JavascriptInterface public boolean notiHabilitado() {
    try {
      String v = Settings.Secure.getString(act.getContentResolver(),
                                           "enabled_notification_listeners");
      return v != null && v.contains(act.getPackageName());
    } catch (Exception e) { return false; }
  }

  @JavascriptInterface public String notis() {
    String j = Escucha.json();
    return j == null ? "null" : j;
  }

  /* la cuenta por paquete para los puntitos de los iconos: ver Escucha.cuenta() */
  @JavascriptInterface public String notiCuenta() {
    String j = Escucha.cuenta();
    return j == null ? "null" : j;
  }

  @JavascriptInterface public boolean notiAbrir(String key) { return Escucha.abre(key); }
  @JavascriptInterface public boolean notiQuitar(String key) { return Escucha.quita(key); }
  @JavascriptInterface public boolean notiLimpiar() { return Escucha.quitaTodo(); }

  /* ── LA PANTALLA DEL PERMISO, DE LO PARTICULAR A LO GENERAL ──
   * La lista de «acceso a notificaciones» de un teléfono tiene cuarenta apps y
   * en HyperOS está enterrada en otro sitio: mandar a alguien ahí y que no
   * encuentre el interruptor se ve igual que un permiso que no se puede dar.
   * Desde API 30 hay un intent que abre DERECHO el interruptor de esta app, y
   * si el ROM no lo tiene se cae a la lista y, en el peor caso, a los ajustes
   * de la propia app. Tres escalones: el que no acepte uno aterriza en el
   * siguiente en vez de no ir a ninguna parte. */
  @JavascriptInterface public boolean notiPedir() {
    ComponentName cn = new ComponentName(act, Escucha.class);
    if (Build.VERSION.SDK_INT >= 30) {
      Intent d = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
      d.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, cn.flattenToString());
      if (lanza(d)) return true;
    }
    Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    resalta(i, cn);
    if (lanza(i)) return true;
    return lanza(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:" + act.getPackageName())));
  }

  /* ══════════ LA ACCESIBILIDAD ══════════
   * Ojo con el nombre: esto NO lee notificaciones —eso es `Escucha`— sino que
   * BAJA la barra del sistema, abre los ajustes rápidos y bloquea la pantalla.
   * Son dos permisos distintos y el panel dice cuál falta. */
  @JavascriptInterface public boolean accesOk() { return Acces.conectada(); }
  @JavascriptInterface public boolean accesHabilitado() { return Acces.habilitada(act); }
  @JavascriptInterface public boolean accesAccion(String q) { return Acces.hace(q); }

  @JavascriptInterface public boolean accesPedir() {
    Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
    resalta(i, new ComponentName(act, Acces.class));
    if (lanza(i)) return true;
    return lanza(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:" + act.getPackageName())));
  }

  /* ══════════ LOS AJUSTES RESTRINGIDOS DE ANDROID 13 ══════════
   * Desde Android 13, una app que NO vino de una tienda no puede encender ni
   * la accesibilidad ni el acceso a notificaciones: el interruptor está ahí y
   * al tocarlo salta «a la app se le negó el acceso». No es un permiso que se
   * pueda pedir —ése es justamente el punto de la protección— así que desde
   * acá no hay nada que llamar: se destraba a mano en Ajustes › la app › ⋮.
   *
   * LO ÚNICO QUE PODEMOS HACER ES DECIRLO Y LLEVAR HASTA LA PUERTA. Un dueño
   * que se choca con ese cartel no tiene forma de saber que el remedio está en
   * OTRA pantalla, y volver a tocar «permitir» lo devuelve a la misma pared.
   *
   * `restringido()` es una PISTA y no una verdad: el sistema anota el estado en
   * un app-op propio (`android:access_restricted_settings`) que uno puede
   * consultar sobre sí mismo, pero es una clave interna y un ROM puede no
   * tenerla. Por eso hay tres respuestas y no dos —1 trabado, 0 libre, −1 no
   * sé— y quien la usa trata el −1 como «no sé», no como «libre». */
  @JavascriptInterface public int restringido() {
    if (Build.VERSION.SDK_INT < 33) return 0;   // la restricción no existe
    try {
      AppOpsManager ao = (AppOpsManager) act.getSystemService(Context.APP_OPS_SERVICE);
      if (ao == null) return -1;
      int m = ao.unsafeCheckOpNoThrow("android:access_restricted_settings",
          Process.myUid(), act.getPackageName());
      return m == AppOpsManager.MODE_ALLOWED ? 0 : 1;
    } catch (Throwable e) { return -1; }
  }

  /* la ficha de ESTA app, que es donde vive el ⋮ con «permitir ajustes
   * restringidos». Es el mismo intent que `info(pkg)` y por eso no puede
   * fallar de una manera nueva. */
  @JavascriptInterface public boolean restringidoAbrir() {
    return lanza(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:" + act.getPackageName())));
  }

  /* le pide a la pantalla de ajustes que deje marcada NUESTRA fila; el extra es
   * interno de la app de Ajustes, así que un ROM que no lo entienda lo ignora y
   * abre la lista igual — no puede romper nada */
  private void resalta(Intent i, ComponentName cn) {
    try {
      String k = cn.flattenToString();
      Bundle b = new Bundle();
      b.putString(":settings:fragment_args_key", k);
      i.putExtra(":settings:fragment_args_key", k);
      i.putExtra(":settings:show_fragment_args", b);
    } catch (Exception e) { }
  }

  private boolean lanza(Intent i) {
    try {
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      act.startActivity(i);
      return true;
    } catch (Exception e) { return false; }
  }

  /* ══════════ BAJAR UNA IMAGEN ══════════
   *
   * ── POR QUÉ NO LO PUEDE HACER EL WEBVIEW ──
   * La interfaz se carga desde `file:///android_asset/`, así que cualquier
   * `fetch` sale con `Origin: null` y el navegador no deja LEER la respuesta sin
   * CORS permisivo. Un `<img src>` sí se puede mostrar, pero no se puede
   * guardar: leer sus píxeles con un lienzo lo tiñe y `toDataURL` tira. De este
   * lado no hay CORS, así que el fondo generado se puede bajar Y guardar.
   *
   * Corre en el hilo del puente, que no es el de la interfaz: un
   * `@JavascriptInterface` se despacha en un hilo propio del WebView, así que
   * esperar la red acá no congela la pantalla.
   *
   * Tope de cuatro megas: es un fondo de pantalla, y sin tope una URL
   * equivocada se traga la memoria del launcher.
   */
  @JavascriptInterface public String baja(String url) {
    return bajaUna(url, null);
  }

  /* ── Y LA QUE DE VERDAD SE USA ES ESTA, PORQUE LA DE ARRIBA CONGELA ──
   *
   * El comentario que estaba acá decía que esperar la red en el hilo del puente
   * «no congela la pantalla». Es media verdad y era el defecto: el hilo de la
   * INTERFAZ de Android no se bloquea, pero el que llama es JavaScript y una
   * llamada a `@JavascriptInterface` es SÍNCRONA — el hilo de JS del WebView se
   * queda esperando el `return`, y ese hilo es el que dibuja la página, atiende
   * el dedo y corre el agua. Medido contra el generador de verdad, nueve
   * pedidos seguidos: seis contestaron una imagen y tres un 500, y los tiempos
   * fueron de 1,7 a **45,7 segundos**. O sea que tocar GENERAR dejaba el
   * launcher tildado casi un minuto — y el botón ni siquiera llegaba a decir
   * «generando», porque el repintado necesita justamente el hilo que quedó
   * bloqueado. Desde afuera eso es «no me deja descargar».
   *
   * Acá la red va en un hilo aparte y la respuesta vuelve por
   * `window.__bajaFin(id, dataURI, motivo)`, igual que los insets y el teclado.
   *
   * ── Y LOS 500 SE REINTENTAN, PORQUE SON TRANSITORIOS ──
   * Los tres que fallaron devolvieron un 500 con un 429 adentro
   * (`community_model_rate_limit`) y el pedido siguiente anduvo. Sin reintento,
   * un tercio de los intentos se informaba como «no se pudo generar» sobre un
   * servicio que estaba a punto de contestar bien.
   */
  /* Va con lambdas y NO con clases anónimas, que es lo que usa el resto de este
     archivo y no es una preferencia de estilo: `d8` 8.2.2 —el único que hay en
     este contenedor, y `maven.google.com` no está en la lista blanca del
     proxy— revienta al dexear ciertas clases internas anónimas con un
     NullPointerException que no dice ni la línea. Ya costó una vuelta con
     `Principal$1` en la 115 y otra en la 124. */
  @JavascriptInterface public void bajaAsinc(final String id, final String url) {
    new Thread(() -> {
      String[] motivo = new String[1];
      String d = "";
      for (int i = 0; i < 3 && d.isEmpty(); i++) {
        if (i > 0) { try { Thread.sleep(1200); } catch (InterruptedException e) { } }
        d = bajaUna(url, motivo);
        /* 'no' y 'grande' no son transitorios: reintentarlos es esperar por nada */
        if ("no".equals(motivo[0]) || "grande".equals(motivo[0])) break;
      }
      final String dd = d;
      final String mm = motivo[0] == null ? "no" : motivo[0];
      /* con el `esc` de este mismo archivo y no con `org.json`: el dato es un
         data URI y un identificador, o sea sólo caracteres de base64 */
      web.post(() -> web.evaluateJavascript("window.__bajaFin && __bajaFin(\""
          + esc(id) + "\",\"" + esc(dd) + "\",\"" + esc(mm) + "\")", null));
    }).start();
  }

  /* `motivo` es una casilla de salida y puede venir en null: 'ok' · 'red' (no
     conectó o cortó) · 'servidor' (5xx o 429, o sea reintentable) · 'no' (no es
     una imagen, o la URL no sirve) · 'grande' (pasó el tope). Distinguir
     'servidor' de 'no' es lo único que hace que el reintento tenga sentido. */
  private String bajaUna(String url, String[] motivo) {
    if (motivo != null) motivo[0] = "no";
    if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return "";
    java.net.HttpURLConnection c = null;
    try {
      c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
      c.setConnectTimeout(15000);
      /* 60 y no 90: el peor caso medido del generador es 45,7 s, y con tres
         intentos un techo de 90 son cuatro minutos y medio de espera. */
      c.setReadTimeout(60000);
      c.setInstanceFollowRedirects(true);
      c.setRequestProperty("User-Agent", "AeroLauncher/1.0");
      int cod = c.getResponseCode();
      if (cod / 100 != 2) {
        if (motivo != null) motivo[0] = (cod >= 500 || cod == 429) ? "servidor" : "no";
        return "";
      }
      String tipo = c.getContentType();
      if (tipo == null || !tipo.startsWith("image/")) {
        /* el generador contesta los errores con 200 y JSON: eso también es
           «el servidor está ocupado», no «la URL no sirve» */
        if (motivo != null) motivo[0] = (tipo != null && tipo.contains("json")) ? "servidor" : "no";
        return "";
      }
      java.io.InputStream in = c.getInputStream();
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buf = new byte[16384];
      int n, total = 0;
      while ((n = in.read(buf)) > 0) {
        total += n;
        if (total > 4 * 1024 * 1024) { in.close(); if (motivo != null) motivo[0] = "grande"; return ""; }
        out.write(buf, 0, n);
      }
      in.close();
      int cp = tipo.indexOf(';');
      if (cp > 0) tipo = tipo.substring(0, cp);
      if (motivo != null) motivo[0] = "ok";
      return "data:" + tipo + ";base64,"
           + android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP);
    } catch (Exception e) {
      if (motivo != null) motivo[0] = "red";
      return "";
    } finally {
      if (c != null) try { c.disconnect(); } catch (Exception e) { }
    }
  }

  @JavascriptInterface public String version() {
    return "{\"sdk\":" + Build.VERSION.SDK_INT + ",\"modelo\":\"" + esc(Build.MODEL) + "\"}";
  }
}
