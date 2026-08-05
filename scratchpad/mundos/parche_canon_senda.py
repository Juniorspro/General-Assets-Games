#!/usr/bin/env python3
"""CAÑON: LA HUELLA TALLADA. El mundo estaba inlograble y sigue estandolo.

MEDIDO, no supuesto. Recorriendo la huella cada metro y medio y comparando la
pendiente en el rumbo de la marcha contra el pendMax de ese punto:

    canon  TRABA en 10/732 muestras · peor pendiente 4.51 en (-20,-40)
           · el salto sube 1.53 m

O sea: hay diez sitios donde el escalon pide una pendiente de hasta 4,5 y el tope
—incluso el tope generoso del corredor de la senda, que es 1,9— no alcanza. Y el
salto sube metro y medio, asi que tampoco se pasa saltando. Dos de esos sitios
estan entre las ruinas y el oasis, que es exactamente "no puedo subir arriba".

POR QUE. El terreno del cañon es SEDIMENTARIO a proposito:

    h = Math.floor(h / 6.5) * 6.5 + (h % 6.5) * .35;

Eso son terrazas de 6,5 m con la contrahuella casi vertical. Ningun tope de
pendiente arregla un escalon de seis metros y medio, y ningun salto de metro y
medio lo sube. Subir el tope no sirve: haria trepable cualquier pared del cañon y
el mundo perderia el sentido de buscar el paso.

LO QUE SE HACE. La huella se TALLA. Dentro del corredor de la senda el terreno
vuelve a su perfil LISO —el que tiene antes de aplicar las terrazas— y afuera
sigue en terrazas como estaba. Se mezcla suave entre los 10 y los 30 m, asi que
lo que se ve es una repisa cortada en la roca que baja por la garganta: es lo que
tiene un cañon de verdad y es lo que hace que la senda sea un camino y no una
sugerencia.

Y funciona porque el perfil liso YA es caminable: la pared del cañon sin terrazas
es `52·exp(-g²·2,4)`, cuya pendiente maxima es 0,72 —por debajo del 0,80 de a pie—.
No hay que inventar nada, hay que dejar de escalonar donde se camina.
"""
import pathlib, sys

p = pathlib.Path('/home/user/mundos/assets/mundos/canon.html')
s = p.read_text(encoding='utf-8')
o = s
err = []

VIEJO = """  h += fbm(x * .011 + 71, z * .011 + 5) * 5.5 * (1 - corte * .7); /* escalones */
  /* terrazas: la roca sedimentaria sube en peldaños */
  h = Math.floor(h / 6.5) * 6.5 + (h % 6.5) * .35;
  /* arcos y agujas cerca de las ruinas */"""

NUEVO = """  h += fbm(x * .011 + 71, z * .011 + 5) * 5.5 * (1 - corte * .7); /* escalones */
  /* TERRAZAS: la roca sedimentaria sube en peldaños de 6,5 m con la contrahuella
     casi vertical. Es el carácter del mundo y se queda.
     ...PERO NO DONDE SE CAMINA. Medido sobre la huella cada metro y medio: diez
     sitios pedían una pendiente de hasta 4,5 contra un tope de 1,9, y el salto
     sube 1,53 m, así que no se pasaban ni saltando —dos de ellos entre las ruinas
     y el oasis, que es el «no puedo subir arriba»—. Ningún tope de pendiente
     arregla un escalón de seis metros y medio, y subir el tope haría trepable
     cualquier pared del cañón, que es justo lo que le da sentido a buscar el paso.
     Así que la huella se TALLA: dentro de su corredor el terreno vuelve al perfil
     LISO (éste, el de antes de escalonar) y afuera sigue en peldaños. Lo que se ve
     es una repisa cortada en la roca bajando por la garganta.
     Funciona porque el perfil liso ya es caminable: la pared del cañón sin
     terrazas es 52·exp(-g²·2,4), cuya pendiente máxima es 0,72, por debajo del
     0,80 de a pie. No hay que inventar nada: hay que dejar de escalonar donde se
     camina. */
  const hLiso = h;
  h = Math.floor(h / 6.5) * 6.5 + (h % 6.5) * .35;
  {
    const w = pesoSenda(x, z);
    if (w > 0) h = h * (1 - w) + hLiso * w;
  }
  /* arcos y agujas cerca de las ruinas */"""

if s.count(VIEJO) == 1:
    s = s.replace(VIEJO, NUEVO, 1)
else:
    err.append('las terrazas aparecen %d veces' % s.count(VIEJO))

# la funcion del corredor, ANTES de alturaBase (se llama desde ahi)
PESO = """/* CUANTO MANDA LA HUELLA EN ESTE PUNTO: 1 encima del camino, 0 a treinta metros.
   Se llama desde `alturaBase`, que corre unas 150.000 veces al armar el terreno,
   asi que primero descarta con dos comparaciones (la caja) y solo despues mide la
   distancia. `SENDA_PTS` se construye MAS ABAJO que esta funcion, y esta bien: no
   se usa hasta que el terreno se arma, y mientras no exista el corredor vale 0 y
   el terreno es el de siempre. */
function pesoSenda(x, z){
  const P = (typeof SENDA_PTS !== 'undefined') && SENDA_PTS;
  if (!P || !P.length) return 0;
  let d2 = 1e9;
  for (let i = 0; i < P.length; i++){
    const dx = x - P[i][0];
    if (dx > 30 || dx < -30) continue;
    const dz = z - P[i][1];
    if (dz > 30 || dz < -30) continue;
    const q = dx * dx + dz * dz;
    if (q < d2) d2 = q;
  }
  if (d2 > 900) return 0;
  const d = Math.sqrt(d2);
  /* suave entre 10 y 30 m: el borde de la repisa no puede ser un escalon nuevo */
  const t = (30 - d) / 20;
  const u = t < 0 ? 0 : (t > 1 ? 1 : t);
  return u * u * (3 - 2 * u);
}
function alturaBase(x, z){"""

if s.count('function alturaBase(x, z){') == 1:
    s = s.replace('function alturaBase(x, z){', PESO, 1)
else:
    err.append('alturaBase aparece %d veces' % s.count('function alturaBase(x, z){'))

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
p.write_text(s, encoding='utf-8')
print('  canon: la huella talla las terrazas (%+d bytes)' % (len(s) - len(o)))
