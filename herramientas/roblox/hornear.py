"""Saca las siete animaciones por defecto de Roblox y las hornea a una tabla
   compacta para el juego. De cada hueso se guarda el angulo X —que es el que
   hace la zancada— y, para el torso y la cabeza, tambien el Z."""
import math, json, sys
sys.path.insert(0, '/tmp/r15v')
from rbxm import analizar, leer_strings, leer_cframes, leer_f32

HUESOS = ['LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot',
          'LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand',
          'UpperTorso','LowerTorso','Head']
CORTO = {'LeftUpperLeg':'pI','LeftLowerLeg':'rI','LeftFoot':'tI',
         'RightUpperLeg':'pD','RightLowerLeg':'rD','RightFoot':'tD',
         'LeftUpperArm':'hI','LeftLowerArm':'cI','LeftHand':'mI',
         'RightUpperArm':'hD','RightLowerArm':'cD','RightHand':'mD',
         'UpperTorso':'to','LowerTorso':'ca','Head':'cz'}

def euler_xyz(m):
    m11,m12,m13, m21,m22,m23, m31,m32,m33 = m
    y = math.asin(max(-1, min(1, m13)))
    if abs(m13) < 0.9999999:
        return math.atan2(-m23, m33), y, math.atan2(-m12, m11)
    return math.atan2(m32, m22), y, 0.0

def sacar(ruta):
    a, clases, props, padres = analizar(ruta)
    iKF = next((i for i,c in clases.items() if c['nombre']=='Keyframe'), None)
    iPO = next((i for i,c in clases.items() if c['nombre']=='Pose'), None)
    if iKF is None or iPO is None: return None
    refKF, refPO = clases[iKF]['refs'], clases[iPO]['refs']
    tiempos = leer_f32(props[(iKF,'Time')][1], len(refKF))
    nombres = leer_strings(props[(iPO,'Name')][1], len(refPO))
    rots, _ = leer_cframes(props[(iPO,'CFrame')][1], len(refPO))
    tKF = {r: tiempos[i] for i,r in enumerate(refKF)}
    def su_t(ref):
        for _ in range(12):
            ref = padres.get(ref)
            if ref is None: return None
            if ref in tKF: return tKF[ref]
        return None
    d = {h: {} for h in HUESOS}
    for i, ref in enumerate(refPO):
        n = nombres[i]
        if n not in d: continue
        t = su_t(ref)
        if t is None: continue
        d[n][round(t,4)] = euler_xyz(rots[i])
    ts = sorted(set(tiempos))
    return ts, d

TABLA = {}
for nombre, arch in [('correr','correr.rbxm'),('caminar','caminar.rbxm'),
                     ('quieto','quieto2.rbxm'),('saltar','saltar.rbxm'),
                     ('caer','caer.rbxm'),('trepar','trepar.rbxm')]:
    r = sacar(arch)
    if not r: print(nombre, 'sin keyframes'); continue
    ts, d = r
    # el ultimo cuadro repite al primero en los ciclos: se saca
    if len(ts) > 2:
        prim = [d[h].get(round(ts[0],4),(0,0,0))[0] for h in HUESOS]
        ult  = [d[h].get(round(ts[-1],4),(0,0,0))[0] for h in HUESOS]
        if max(abs(a-b) for a,b in zip(prim,ult)) < 0.02: ts = ts[:-1]
    filas = {}
    for h in HUESOS:
        filas[CORTO[h]] = [round(d[h].get(round(t,4),(0,0,0))[0], 3) for t in ts]
    # el balanceo lateral del torso y la cabeza: eje Z
    filas['toZ'] = [round(d['UpperTorso'].get(round(t,4),(0,0,0))[2], 3) for t in ts]
    dur = ts[-1] + (ts[1]-ts[0] if len(ts) > 1 else 0.1)
    TABLA[nombre] = {'dur': round(dur,4), 'n': len(ts), 'k': filas}
    print('%-8s %2d cuadros  %.3f s' % (nombre, len(ts), dur))

json.dump(TABLA, open('/tmp/r15v/animaciones.json','w'), separators=(',',':'))
print('\nbytes de la tabla:', len(open('/tmp/r15v/animaciones.json').read()))
