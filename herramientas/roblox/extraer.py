"""Saca los angulos de cada articulacion, keyframe por keyframe, de la
   animacion de correr real de Roblox (asset 913376220).

   El Pose de cada hueso guarda un CFrame relativo al hueso padre. La matriz de
   rotacion se pasa a Euler XYZ con la MISMA convencion que usa three.js, asi
   los numeros entran derecho en el juego. */"""
import struct, math, json, sys
sys.path.insert(0, '/tmp/r15v')
from rbxm import analizar, leer_strings, leer_cframes, leer_f32

a, clases, props, padres = analizar('/tmp/r15v/run.rbxm')
donde = {}
for ci, c in clases.items():
    for i, r in enumerate(c['refs']):
        donde[r] = (ci, i)
nom_clase = {i: c['nombre'] for i, c in clases.items()}

iKF = next(i for i,c in clases.items() if c['nombre']=='Keyframe')
iPO = next(i for i,c in clases.items() if c['nombre']=='Pose')
refKF, refPO = clases[iKF]['refs'], clases[iPO]['refs']

tiempos = leer_f32(props[(iKF,'Time')][1], len(refKF))
nombres = leer_strings(props[(iPO,'Name')][1], len(refPO))
rots, _ = leer_cframes(props[(iPO,'CFrame')][1], len(refPO))

# de cada Pose, subir por el arbol hasta su Keyframe: asi no hay que suponer
# que el orden de las poses sigue al de los keyframes
tKF = {r: tiempos[i] for i, r in enumerate(refKF)}
def su_tiempo(ref):
    v = 0
    while ref in padres and v < 12:
        ref = padres[ref]
        if ref in tKF: return tKF[ref]
        v += 1
    return None

def euler_xyz(m):
    """three.js, orden XYZ, desde una matriz fila-mayor."""
    m11,m12,m13, m21,m22,m23, m31,m32,m33 = m
    y = math.asin(max(-1, min(1, m13)))
    if abs(m13) < 0.9999999:
        x = math.atan2(-m23, m33); z = math.atan2(-m12, m11)
    else:
        x = math.atan2(m32, m22); z = 0.0
    return x, y, z

HUESOS = ['LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot',
          'LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand',
          'UpperTorso','LowerTorso','Head']
datos = {h: {} for h in HUESOS}
for i, ref in enumerate(refPO):
    n = nombres[i]
    if n not in datos: continue
    t = su_tiempo(ref)
    if t is None: continue
    datos[n][round(t, 4)] = euler_xyz(rots[i])

ts = sorted(tiempos)
print('ciclo de %.3f s, %d cuadros (%.0f fps)\n' % (ts[-1] + (ts[1]-ts[0]), len(ts), 1/(ts[1]-ts[0])))
print('%-16s' % 'hueso (angulo X, en radianes)', ' '.join('%6.3f' % t for t in ts))
for h in HUESOS:
    fila = [datos[h].get(round(t,4), (0,0,0))[0] for t in ts]
    print('%-16s' % h, ' '.join('%6.2f' % v for v in fila))
json.dump({'t': ts, 'huesos': {h: [datos[h].get(round(t,4),(0,0,0)) for t in ts] for h in HUESOS}},
          open('/tmp/r15v/correr.json','w'))
print('\nguardado /tmp/r15v/correr.json')
