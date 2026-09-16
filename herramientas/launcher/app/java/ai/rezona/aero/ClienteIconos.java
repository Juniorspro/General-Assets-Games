package ai.rezona.aero;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Sirve los iconos de las apps como si fueran imágenes de la red.
 *
 * ── POR QUÉ ASÍ Y NO POR EL PUENTE ──
 * Devolviendo los iconos en base64 desde `apps()`, cien apps son millón y medio
 * de bytes de string cruzando a JavaScript de una, en el hilo principal, antes
 * de que se pueda dibujar el primer cuadro. Sirviéndolos como recurso, cada
 * `<img>` los pide cuando le toca, el PNG se arma en el hilo de red del WebView,
 * el decodificado lo hace el navegador —que es donde se hace bien— y encima le
 * queda en su propia caché de imágenes, así que volver al escritorio no
 * reconstruye nada.
 */
public class ClienteIconos extends WebViewClient {

  private static final String HOST = "icono.aero";
  private final Puente puente;
  /* ── LA CACHÉ ESTÁ ESCRITA A MANO, Y NO ES POR GUSTO ──
     Lo natural es `LruCache<String, byte[]>`, y no compila: **el d8 8.2.2 de
     este SDK, corriendo sobre JDK 21, revienta con un `NullPointerException:
     Cannot invoke "String.length()"` al dexear CUALQUIER clase que lleve un
     método puente**. Reducido al mínimo, `class H implements Comparable<H>`
     —dos `compareTo`, uno de ellos el puente que genera javac— falla igual, y
     las otras siete clases de esta app pasan. O sea que no es de este código:
     es la herramienta. No se puede cambiar de d8 porque `maven.google.com` no
     está en la lista blanca del proxy de salida.

     Así que la caché no hereda de nada genérico y no hay puente que dexear.
     Son veinte líneas y hace exactamente lo que hacía falta: mapa por clave,
     orden de uso, y un tope en bytes. */
  private final HashMap<String, byte[]> cache = new HashMap<String, byte[]>();
  private final ArrayList<String> orden = new ArrayList<String>();
  private int bytes = 0;
  /* dos megas de PNG ya comprimido alcanzan para un cajón entero, y el tope
     existe porque un teléfono con trescientas apps no puede quedárselas todas */
  private static final int TOPE = 2*1024*1024;

  private synchronized byte[] leeCache(String k) {
    byte[] v = cache.get(k);
    if (v != null) { orden.remove(k); orden.add(k); }   /* el más usado, al final */
    return v;
  }

  private synchronized void ponCache(String k, byte[] v) {
    /* el que ya estaba se descuenta: sin esto, reemplazar un icono suma dos
       veces y el contador se va por encima del tope sin que sobre nada */
    byte[] antes = cache.put(k, v);
    if (antes != null) bytes -= antes.length;
    else orden.add(k);
    bytes += v.length;
    while (bytes > TOPE && orden.size() > 1) {
      byte[] fuera = cache.remove(orden.remove(0));
      if (fuera != null) bytes -= fuera.length;
    }
  }

  public ClienteIconos(Puente p) { this.puente = p; }

  @Override public WebResourceResponse shouldInterceptRequest(WebView w, WebResourceRequest req) {
    Uri u = req.getUrl();
    if (u == null || !HOST.equals(u.getHost())) return null;
    String pkg = u.getLastPathSegment();
    if (pkg == null || pkg.isEmpty()) return null;

    int lado = 144;
    String q = u.getQueryParameter("l");
    if (q != null) try { lado = Math.max(48, Math.min(256, Integer.parseInt(q))); } catch (Exception e) {}

    String clave = pkg + "@" + lado;
    byte[] png = leeCache(clave);
    if (png == null) {
      png = puente.iconoPng(pkg, lado);
      if (png == null) return vacio();
      ponCache(clave, png);
    }

    Map<String, String> h = new HashMap<>();
    h.put("Access-Control-Allow-Origin", "*");
    /* el icono de una app no cambia entre dos aperturas del escritorio */
    h.put("Cache-Control", "public, max-age=86400");
    WebResourceResponse r = new WebResourceResponse("image/png", null, new ByteArrayInputStream(png));
    r.setResponseHeaders(h);
    return r;
  }

  /* una app sin icono no puede tirar la petición: devuelve un PNG de un píxel
     transparente y la página dibuja su propio marcador debajo */
  private static WebResourceResponse vacio() {
    byte[] px = new byte[]{
      (byte)0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0,0,0,0x0D,0x49,0x48,0x44,0x52,
      0,0,0,1,0,0,0,1,8,6,0,0,0,0x1F,0x15,(byte)0xC4,(byte)0x89,
      0,0,0,0x0A,0x49,0x44,0x41,0x54,0x78,(byte)0x9C,0x63,0,1,0,0,5,0,1,
      0x0D,0x0A,0x2D,(byte)0xB4,0,0,0,0,0x49,0x45,0x4E,0x44,(byte)0xAE,0x42,0x60,(byte)0x82 };
    return new WebResourceResponse("image/png", null, new ByteArrayInputStream(px));
  }
}
