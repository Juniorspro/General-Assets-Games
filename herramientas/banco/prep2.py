# Reescribe los CDN del HTML a los node_modules locales, porque los modulos ES no cargan por file://
# y el contenedor no siempre tiene salida a la red.
import sys, re, io
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
s = s.replace('https://unpkg.com/three@0.170.0/build/three.module.js', './node_modules/three/build/three.module.js')
s = s.replace('https://unpkg.com/three@0.170.0/examples/jsm/', './node_modules/three/examples/jsm/')
# MediaPipe igual que three.js, y por la MISMA razon: Chromium en el contenedor no usa el proxy de
# salida (curl si), asi que un import dinamico a jsdelivr falla con 'Failed to fetch dynamically
# imported module'. Servidos desde /tmp/ui/mp el pipeline entero se puede probar de verdad.
s = s.replace('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs', './mp/vision_bundle.mjs')
s = s.replace('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm', './mp/wasm')
s = s.replace('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', './mp/hand_landmarker.task')
s = re.sub(r'https://cdn\.jsdelivr\.net/gh/[^/]+/[^@]+@[0-9a-f]+/assets/fp/', './fp/', s)
s = s.replace('</head>', '<script>window.__errs=[];addEventListener("error",e=>window.__errs.push(String(e.message)));</script></head>')
io.open(dst, 'w', encoding='utf8').write(s)
print(dst, len(s))
