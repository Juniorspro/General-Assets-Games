# Prepara PUERTA BLANCA para el banco de /tmp/ui.
#
# POR QUE HACE FALTA UNO PROPIO: el prep2.py del banco reescribe three desde
# unpkg y en modulo ES; este juego trae three **r128 en script clasico desde
# cdnjs**, que es otra URL y otra forma de cargarse. Y Chromium en el contenedor
# no usa el proxy de salida (curl si), asi que sin reescribir la URL el juego
# arranca sin THREE y la pantalla queda negra — que se lee igual que un error
# del juego y no lo es.
#
# La copia local se baja una vez con:
#   curl -o /tmp/ui/three.r128.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
import io, sys

src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()

CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
assert CDN in s, 'no esta el CDN de three r128: mira si cambio la version'
s = s.replace(CDN, './three.r128.min.js')

# el recolector de errores va ANTES que todo lo demas, para que agarre tambien
# los de la carga
s = s.replace('</head>',
              '<script>window.__errs=[];'
              'addEventListener("error",e=>window.__errs.push(String(e.message)));'
              'addEventListener("unhandledrejection",e=>window.__errs.push("promesa: "+e.reason));'
              '</script></head>')

io.open(dst, 'w', encoding='utf8').write(s)
print(dst, len(s), 'bytes')
