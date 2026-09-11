package ai.rezona.aero;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;

/* ══════════ EL SERVICIO DE ACCESIBILIDAD ══════════
 *
 * ── QUÉ HACE Y QUÉ NO, PORQUE ES FÁCIL CONFUNDIRLO ──
 * Esto NO lee notificaciones. Las notificaciones las lee `Escucha`, que es un
 * `NotificationListenerService`, y ése es otro permiso y otra pantalla del
 * sistema. Un servicio de accesibilidad ve pasar eventos de notificación pero
 * no tiene `getActiveNotifications()`, así que con él la lista quedaría
 * incompleta y sin poder borrar nada.
 *
 * Lo que sí hace, y es lo que un launcher no puede hacer de ninguna otra
 * forma, son las ACCIONES GLOBALES: bajar la barra de notificaciones del
 * sistema, abrir los ajustes rápidos, apagar la pantalla, recientes y atrás.
 * La vuelta 126 dejó anotado que diez de los doce interruptores del centro de
 * control son atajos que abren un panel del sistema porque desde Android 10
 * una app normal no puede prender el wifi ni el bluetooth; esto no cambia eso,
 * pero convierte «abrir la barra» y «bloquear» en acciones de verdad.
 *
 * ── NO GUARDA ESTADO NI MIRA NADA ──
 * `canRetrieveWindowContent` NO se pide y la máscara de eventos es cero: este
 * servicio no lee el contenido de ninguna pantalla. Lo único que expone es
 * `performGlobalAction`, o sea los mismos gestos que el dueño ya puede hacer
 * con el dedo. Pedir permisos que no se usan es lo que hace que nadie los dé.
 */
public class Acces extends AccessibilityService {

  private static Acces viva = null;

  @Override public void onServiceConnected() { viva = this; }
  @Override public void onDestroy() { if (viva == this) viva = null; super.onDestroy(); }
  @Override public void onInterrupt() { }
  @Override public void onAccessibilityEvent(AccessibilityEvent e) { }

  /** ¿el servicio está enlazado AHORA? */
  public static boolean conectada() { return viva != null; }

  /* ── HABILITADO NO ES LO MISMO QUE ENLAZADO ──
   * Igual que con las notificaciones: el dueño puede haberlo habilitado y
   * Android tardar en enlazarlo. Volver a pedirle el permiso a alguien que ya
   * lo dio es lo peor que se puede hacer, así que se preguntan las dos cosas
   * por separado y el aviso dice «esperando» en vez de «dalo otra vez». */
  public static boolean habilitada(Context c) {
    try {
      String v = Settings.Secure.getString(c.getContentResolver(),
          Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
      if (TextUtils.isEmpty(v)) return false;
      String yo = new ComponentName(c, Acces.class).flattenToString();
      String yoCorto = c.getPackageName() + "/.Acces";
      return v.contains(yo) || v.contains(yoCorto);
    } catch (Exception e) { return false; }
  }

  /** las cinco acciones que el launcher necesita, por nombre */
  public static boolean hace(String que) {
    Acces a = viva;
    if (a == null || que == null) return false;
    int g;
    if (que.equals("notis"))       g = GLOBAL_ACTION_NOTIFICATIONS;
    else if (que.equals("rapidos")) g = GLOBAL_ACTION_QUICK_SETTINGS;
    else if (que.equals("atras"))   g = GLOBAL_ACTION_BACK;
    else if (que.equals("recientes")) g = GLOBAL_ACTION_RECENTS;
    else if (que.equals("bloquear")) {
      /* GLOBAL_ACTION_LOCK_SCREEN existe desde API 28; por debajo no hay forma
         de bloquear sin ser administrador del aparato, que es un permiso mucho
         más grande por un botón. */
      if (Build.VERSION.SDK_INT < 28) return false;
      g = GLOBAL_ACTION_LOCK_SCREEN;
    }
    else return false;
    try { return a.performGlobalAction(g); } catch (Exception e) { return false; }
  }
}
