#!/usr/bin/env python3
# Saca del GLB el esqueleto (jerarquia + reposo) y las pistas de cadera+piernas de los clips que usa el juego.
# Todo queda en unidades de HUESO (las mismas del GLB): el grupo raiz lleva la escala 0.01*bodyScale, asi que
# los valores de las pistas se aplican sin convertir nada. Convertir era la fuente del bug de unidades de antes.
import json, struct, base64, sys

GLB='parkour.glb'
USA=['idle','walk','run','jump','slide']            # los unicos clips que este juego reproduce
PISTAS={'Hips','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
        'RightUpLeg','RightLeg','RightFoot','RightToeBase'}   # de la cintura para arriba manda el codigo

d=open(GLB,'rb').read(); off=12; ch=[]
while off<len(d):
    ln,ty=struct.unpack_from('<II',d,off); off+=8; ch.append((ty,d[off:off+ln])); off+=ln
j=json.loads(ch[0][1].decode('utf-8')); BIN=ch[1][1]

CT={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def leer(i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
    fmt,sz=CT[a['componentType']]; n=NC[a['type']]
    ini=bv.get('byteOffset',0)+a.get('byteOffset',0)
    paso=bv.get('byteStride') or sz*n
    out=[]
    for k in range(a['count']):
        o=ini+k*paso
        out.append(list(struct.unpack_from('<'+fmt*n, BIN, o)))
    return out

nodos=j['nodes']
padre={}
for i,n in enumerate(nodos):
    for c in n.get('children',[]): padre[c]=i

# el esqueleto cuelga de 'Armature'; ignoramos el nodo de la malla
raiz=[i for i,n in enumerate(nodos) if n.get('name')=='Hips'][0]
huesos=[]; idx={}
def rec(i):
    idx[i]=len(huesos)
    n=nodos[i]
    huesos.append({'n':n.get('name'),
                   'p':idx.get(padre.get(i),-1) if padre.get(i) in idx else -1,
                   't':[round(v,4) for v in n.get('translation',[0,0,0])],
                   'q':[round(v,5) for v in n.get('rotation',[0,0,0,1])]})
    for c in n.get('children',[]):
        if nodos[c].get('mesh') is None: rec(c)
rec(raiz)

clips={}
for a in j['animations']:
    nm=a.get('name')
    if nm not in USA: continue
    tr={}
    for cnl in a['channels']:
        nodo=nodos[cnl['target']['node']].get('name')
        if nodo not in PISTAS: continue
        pth=cnl['target']['path']
        if pth=='scale': continue          # la escala de huesos solo trajo problemas (tiron de 0.098 m)
        s=a['samplers'][cnl['sampler']]
        t=[round(v[0],4) for v in leer(s['input'])]
        v=[round(x,5) for f in leer(s['output']) for x in f]
        tr.setdefault(nodo,{})[pth[0]]={'t':t,'v':v}
    dur=max(max(c['t']) for b in tr.values() for c in b.values())
    clips[nm]={'d':round(dur,4),'b':tr}

datos={'h':huesos,'c':clips}
js=json.dumps(datos,separators=(',',':'))
open('cuerpo_datos.json','w').write(js)
print('huesos:',len(huesos))
print('clips :',{k:(v['d'],len(v['b'])) for k,v in clips.items()})
print('json  : %.1f KB'%(len(js)/1024))
