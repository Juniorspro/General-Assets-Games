# Reescribe los CDN del HTML a los node_modules locales, porque los modulos ES no cargan por file://
# y el contenedor no siempre tiene salida a la red.
import sys, re, io
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
s = s.replace('https://unpkg.com/three@0.170.0/build/three.module.js', './node_modules/three/build/three.module.js')
s = s.replace('https://unpkg.com/three@0.170.0/examples/jsm/', './node_modules/three/examples/jsm/')
s = re.sub(r'https://cdn\.jsdelivr\.net/gh/[^/]+/[^@]+@[0-9a-f]+/assets/fp/', './fp/', s)
s = s.replace('</head>', '<script>window.__errs=[];addEventListener("error",e=>window.__errs.push(String(e.message)));</script></head>')
io.open(dst, 'w', encoding='utf8').write(s)
print(dst, len(s))
