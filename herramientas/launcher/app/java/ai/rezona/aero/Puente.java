package ai.rezona.aero;

import android.app.Activity;
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
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
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

  @JavascriptInterface public String version() {
    return "{\"sdk\":" + Build.VERSION.SDK_INT + ",\"modelo\":\"" + esc(Build.MODEL) + "\"}";
  }
}
