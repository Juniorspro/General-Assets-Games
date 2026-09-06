package ai.rezona.aero;

import android.content.Intent;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

/**
 * El selector de archivos de la galería de fondos.
 *
 * ── POR QUÉ ES UNA CLASE CON NOMBRE Y NO UNA ANÓNIMA ──
 * Escrita como `new WebChromeClient(){...}` adentro de `onCreate`, `d8` 8.2.2
 * revienta al dexear `Principal$1` con un NullPointerException que no dice qué
 * le pasa — es el mismo defecto de la herramienta que en la vuelta 115 obligó a
 * escribir la caché de iconos a mano, y no se puede cambiar de `d8` porque
 * `maven.google.com` no está en la lista blanca del proxy. Una clase propia en
 * su propio archivo pasa, igual que `ClienteIconos`.
 *
 * ── Y SIN ESTO `<input type=file>` NO HACE NADA ──
 * Un WebView sin WebChromeClient ignora el selector en silencio: se toca «la
 * tuya» y no pasa absolutamente nada, sin error ni aviso.
 */
public class ClienteArchivo extends WebChromeClient {

  /** el número con el que vuelve por `onActivityResult` */
  public static final int PIDE = 7301;

  private final Principal act;
  private ValueCallback<Uri[]> cb;

  public ClienteArchivo(Principal a) { act = a; }

  @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> valor,
                                             FileChooserParams params) {
    /* uno anterior sin cerrar: hay que contestarle o el WebView no vuelve a
       abrir el selector nunca más */
    if (cb != null) cb.onReceiveValue(null);
    cb = valor;
    try {
      Intent i = params.createIntent();
      i.addCategory(Intent.CATEGORY_OPENABLE);
      act.startActivityForResult(i, PIDE);
      return true;
    } catch (Exception e) {
      cb = null;
      return false;
    }
  }

  /**
   * La respuesta. **Cancelar también es una respuesta**: sin llamar al callback
   * el WebView se queda esperando para siempre y el `<input>` queda muerto hasta
   * reiniciar la app.
   */
  public void resultado(int res, Intent datos) {
    if (cb == null) return;
    cb.onReceiveValue(FileChooserParams.parseResult(res, datos));
    cb = null;
  }
}
