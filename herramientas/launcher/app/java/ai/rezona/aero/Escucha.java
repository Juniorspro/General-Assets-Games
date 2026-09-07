package ai.rezona.aero;

import android.app.Notification;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.ArrayList;
import java.util.List;

/**
 * Las notificaciones de verdad.
 *
 * ── POR QUÉ HACE FALTA UN SERVICIO Y NO ALCANZA EL PUENTE ──
 * Un launcher no puede LEER las notificaciones desde su actividad: Android sólo
 * se las cuenta a un `NotificationListenerService`, y encima el dueño tiene que
 * habilitarlo a mano en una pantalla del sistema. O sea que esto es lo único de
 * este launcher que no se puede encender desde adentro — y por eso el centro de
 * control tiene que poder decir «faltás habilitarme» en vez de mostrar una
 * lista vacía, que se lee a que no hay notificaciones.
 *
 * ── Y NO SE GUARDA NADA ──
 * No hay lista propia: se le pregunta a `getActiveNotifications()` cuando el
 * centro de control se abre. Una copia nuestra se desincroniza en cuanto el
 * dueño descarta algo desde otra parte, y una lista de notificaciones
 * desincronizada muestra mensajes que ya no existen.
 */
public class Escucha extends NotificationListenerService {

  private static Escucha viva = null;

  @Override public void onListenerConnected() { viva = this; }
  @Override public void onListenerDisconnected() { viva = null; }

  static boolean conectada() { return viva != null; }

  /** el JSON que lee el centro de control. Sin servicio conectado devuelve null. */
  static String json() {
    Escucha e = viva;
    if (e == null) return null;
    StatusBarNotification[] ns;
    try { ns = e.getActiveNotifications(); } catch (Exception x) { return null; }
    if (ns == null) return "[]";
    StringBuilder b = new StringBuilder("[");
    int n = 0;
    for (int i = ns.length - 1; i >= 0 && n < 24; i--) {
      StatusBarNotification s = ns[i];
      if (s == null) continue;
      Notification no = s.getNotification();
      if (no == null) continue;
      /* las de grupo resumen lo que ya está listado abajo: puestas, cada
         conversación aparece dos veces */
      if ((no.flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
      CharSequence tit = null, txt = null;
      if (no.extras != null) {
        tit = no.extras.getCharSequence(Notification.EXTRA_TITLE);
        txt = no.extras.getCharSequence(Notification.EXTRA_TEXT);
        if (txt == null) txt = no.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
      }
      if (tit == null && txt == null) continue;   /* sin nada que mostrar no es una fila */
      if (n > 0) b.append(',');
      n++;
      b.append("{\"k\":\"").append(esc(s.getKey()))
       .append("\",\"p\":\"").append(esc(s.getPackageName()))
       .append("\",\"t\":\"").append(esc(tit == null ? "" : tit.toString()))
       .append("\",\"x\":\"").append(esc(txt == null ? "" : txt.toString()))
       .append("\",\"ms\":").append(s.getPostTime())
       .append(",\"quita\":").append(esQuitable(s))
       .append('}');
    }
    return b.append(']').toString();
  }

  private static boolean esQuitable(StatusBarNotification s) {
    if (Build.VERSION.SDK_INT >= 21) return s.isClearable();
    return true;
  }

  static boolean quita(String key) {
    Escucha e = viva;
    if (e == null || key == null) return false;
    try { e.cancelNotification(key); return true; } catch (Exception x) { return false; }
  }

  static boolean quitaTodo() {
    Escucha e = viva;
    if (e == null) return false;
    try { e.cancelAllNotifications(); return true; } catch (Exception x) { return false; }
  }

  /** abre la notificación por su propio `contentIntent`, que es lo que hace el
   *  panel del sistema: sin eso, tocar una fila abriría la app en su pantalla
   *  principal en vez de en la conversación. */
  static boolean abre(String key) {
    Escucha e = viva;
    if (e == null || key == null) return false;
    try {
      StatusBarNotification[] ns = e.getActiveNotifications();
      if (ns == null) return false;
      for (int i = 0; i < ns.length; i++) {
        if (!key.equals(ns[i].getKey())) continue;
        Notification no = ns[i].getNotification();
        if (no == null || no.contentIntent == null) return false;
        no.contentIntent.send();
        if (esQuitable(ns[i])) e.cancelNotification(key);
        return true;
      }
    } catch (Exception x) { }
    return false;
  }

  private static String esc(String s) {
    if (s == null) return "";
    StringBuilder b = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"' || c == '\\') b.append('\\').append(c);
      else if (c == '\n' || c == '\r' || c == '\t') b.append(' ');
      else if (c < 0x20) ;
      else b.append(c);
    }
    return b.toString();
  }
}
