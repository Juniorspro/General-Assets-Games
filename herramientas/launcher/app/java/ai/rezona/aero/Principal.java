package ai.rezona.aero;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * El launcher es UN WebView a pantalla completa.
 *
 * ── POR QUÉ WEBVIEW Y NO VISTAS NATIVAS ──
 * Lo que se pidió es el vidrio: refracción de lo que hay detrás, especular en el
 * canto, saturación del fondo. En Android eso nativo son RenderEffect (API 31+,
 * o sea que deja afuera media base) más un shader AGSL por cada pieza. En un
 * WebView es `backdrop-filter` más un feDisplacementMap, funciona desde Android 8
 * y encima el fondo animado se dibuja en un canvas que ya sé medir.
 * Lo que el WebView NO puede hacer —enumerar apps, sus iconos, lanzarlas— lo
 * hace el puente, y es exactamente la frontera correcta.
 */
public class Principal extends Activity {

  private WebView web;
  private Puente puente;

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);

    /* ── EL LAUNCHER DIBUJA DEBAJO DE LAS BARRAS ──
       Un escritorio que respeta los insets deja dos franjas de color plano
       arriba y abajo, y ahí se corta el cielo. Se dibuja de borde a borde y los
       márgenes seguros se le pasan a la página, que los usa como padding. */
    if (Build.VERSION.SDK_INT >= 30) {
      getWindow().setDecorFitsSystemWindows(false);
    } else {
      getWindow().getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);

    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);                 /* el orden de los iconos se guarda ahí */
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    /* el escritorio no hace zoom ni rebota: es una pantalla fija */
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setTextZoom(100);                           /* el tamaño de letra del sistema no lo deforma */
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    web.setBackgroundColor(0xff0a3d6b);
    if (Build.VERSION.SDK_INT >= 19) WebView.setWebContentsDebuggingEnabled(false);

    puente = new Puente(this, web);
    web.addJavascriptInterface(puente, "AND");
    web.setWebViewClient(new ClienteIconos(puente));

    FrameLayout raiz = new FrameLayout(this);
    raiz.setBackgroundColor(0xff0a3d6b);
    raiz.addView(web, new FrameLayout.LayoutParams(-1, -1));
    setContentView(raiz);

    /* los insets llegan a la página como variables de CSS */
    raiz.setOnApplyWindowInsetsListener((v, ins) -> {
      int arriba, abajo;
      if (Build.VERSION.SDK_INT >= 30) {
        android.graphics.Insets q = ins.getInsets(
            WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
        arriba = q.top; abajo = q.bottom;
      } else {
        arriba = ins.getSystemWindowInsetTop(); abajo = ins.getSystemWindowInsetBottom();
      }
      final float d = getResources().getDisplayMetrics().density;
      puente.insets(Math.round(arriba/d), Math.round(abajo/d));
      /* ── Y EL TECLADO, QUE ES OTRO INSET ──
         Se le resta lo que ya ocupa la barra de navegación: el inset del IME la
         incluye, así que sin la resta la mascota quedaría una barra de más por
         encima del teclado. Por debajo de API 30 no hay forma de preguntarlo y
         se informa cero, que es lo mismo que había hasta ahora. */
      int tecl = 0;
      if (Build.VERSION.SDK_INT >= 30) {
        int ime = ins.getInsets(WindowInsets.Type.ime()).bottom;
        int nav = ins.getInsets(WindowInsets.Type.navigationBars()).bottom;
        tecl = Math.max(0, ime - nav);
      }
      puente.teclado(Math.round(tecl/d));
      return ins;
    });

    /* ── EL PRIMER ENVÍO DE INSETS SE PIERDE, Y LO ARREGLA LA PÁGINA ──
       El listener de arriba dispara al adjuntar la vista, o sea antes de que
       `ui.html` exista: ese `evaluateJavascript` no encuentra `window.__insets`
       y se va al vacío, y el valor de fábrica se queda para siempre — en el
       teléfono eso dejaba la barra de búsqueda del cajón pisada por los iconos
       de la barra de estado. El dato ya vive guardado en el puente, así que el
       arreglo es que la página lo PIDA al arrancar (`pideInsets`), que corre
       cuando la página seguro existe. Acá no hace falta un segundo camino. */
    web.loadUrl("file:///android_asset/ui.html");
  }

  /* ── HOME NO RECARGA: AVISA ──
     Con `singleTask`, volver al escritorio entra por acá y no por `onCreate`.
     La página se entera para poder cerrar el cajón, la búsqueda o el modo de
     edición: llegar al escritorio y encontrarlo como lo dejaste hace tres apps
     no es «conservar el estado», es que quedó trabado. */
  @Override protected void onNewIntent(Intent i) {
    super.onNewIntent(i);
    if (web != null) web.evaluateJavascript("window.__alInicio && __alInicio()", null);
  }

  /* la respuesta del diálogo del rol HOME: la página repinta el panel para que
     el estado que muestra sea el de después y no el de antes */
  @Override protected void onActivityResult(int pedido, int res, Intent datos) {
    super.onActivityResult(pedido, res, datos);
    if (web != null) web.evaluateJavascript("window.__alVolver && __alVolver()", null);
  }

  @Override protected void onResume() {
    super.onResume();
    if (web != null) {
      web.onResume();
      web.evaluateJavascript("window.__alVolver && __alVolver()", null);
    }
  }

  @Override protected void onPause() {
    /* el fondo animado se para: un escritorio que sigue dibujando burbujas con la
       pantalla apagada se come la batería y no lo ve nadie */
    if (web != null) web.onPause();
    super.onPause();
  }

  /* En un launcher, «atrás» NO sale de la app: no hay a dónde salir. Lo que hace
     es cerrar lo que esté abierto encima, y eso lo decide la página. */
  @Override public void onBackPressed() {
    if (web != null) web.evaluateJavascript("window.__atras && __atras()", null);
  }
}
