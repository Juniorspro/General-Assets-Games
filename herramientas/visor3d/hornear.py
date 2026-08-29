# -*- coding: utf-8 -*-
"""
Hornea el GLB del visor: textura a JPEG 512 y reempaquetado, pero CONSERVANDO las
animaciones — que aca son el producto, no un clip de regalo de Meshy generado con Higgsfield (Meshy image_to_3d, riggeado y texturizado) para que
entre en un HTML de un solo archivo.

VIENE DE 8,2 MB Y CASI TODO ES LA TEXTURA: un PNG grande sin comprimir. El modelo son 12.180
triangulos; el resto es la imagen.

TRES COSAS, EN ESTE ORDEN:
1. LA TEXTURA A JPEG DE 512. A JPEG y no a WebP a proposito: WebP dentro de un GLB necesita la
   extension EXT_texture_webp declarada, y si el cargador no la soporta el modelo aparece SIN
   textura. JPEG es parte del nucleo de glTF y lo lee cualquier cargador. En un personaje de dos
   metros visto a tres, 512 es mas de lo que se llega a ver.
2. SE TIRA LA ANIMACION QUE VIENE. Meshy mete un clip por defecto; las cuatro animaciones de este
   juego estan escritas a mano sobre el esqueleto, asi que ese clip son bytes que nadie lee.
3. SE REEMPAQUETA EL BINARIO DEJANDO SOLO LO QUE SE USA. Al sacar la animacion quedan accesores y
   bufferViews huerfanos: si se dejan, el archivo pesa igual que antes y el ahorro es imaginario.
"""
import io, os, json, struct
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = '/home/user/General-Assets-Games'
ENT  = os.path.join(RAIZ, 'herramientas', 'visor3d', 'maicol3d_rig.glb')
SAL  = os.path.join(RAIZ, 'herramientas', 'visor3d', 'maicol3d_p.glb')
TEX_LADO = 512
TEX_Q = 82

def leer(p):
    b=open(p,'rb').read()
    assert b[:4]==b'glTF', 'no es glb'
    total=struct.unpack('<I', b[8:12])[0]
    off=12; js=None; bina=None
    while off < total:
        clen, ctype = struct.unpack('<I4s', b[off:off+8])
        dat=b[off+8:off+8+clen]
        if ctype==b'JSON': js=json.loads(dat.decode('utf8'))
        elif ctype==b'BIN\x00': bina=dat
        off += 8+clen
    return js, bytearray(bina)

def escribir(p, js, bina):
    jb=json.dumps(js, separators=(',',':')).encode('utf8')
    jb += b' '*((4-len(jb)%4)%4)
    bb=bytes(bina); bb += b'\x00'*((4-len(bb)%4)%4)
    total=12+8+len(jb)+8+len(bb)
    with open(p,'wb') as f:
        f.write(b'glTF'); f.write(struct.pack('<I',2)); f.write(struct.pack('<I',total))
        f.write(struct.pack('<I',len(jb))); f.write(b'JSON'); f.write(jb)
        f.write(struct.pack('<I',len(bb))); f.write(b'BIN\x00'); f.write(bb)

def vista(js, bina, i):
    v=js['bufferViews'][i]
    o=v.get('byteOffset',0)
    return bytes(bina[o:o+v['byteLength']])

def main():
    js, bina = leer(ENT)
    antes=os.path.getsize(ENT)
    nuevas_img=[]
    for k, im in enumerate(js.get('images',[])):
        if 'bufferView' not in im:
            nuevas_img.append(None); continue
        raw=vista(js, bina, im['bufferView'])
        img=Image.open(io.BytesIO(raw)).convert('RGB')
        w,h=img.size
        if max(w,h) > TEX_LADO:
            e=TEX_LADO/float(max(w,h))
            img=img.resize((max(1,int(w*e)), max(1,int(h*e))), Image.LANCZOS)
        buf=io.BytesIO(); img.save(buf,'JPEG',quality=TEX_Q,optimize=True)
        nuevas_img.append(buf.getvalue())
        print('  textura %d: %dx%d %s -> %dx%d jpeg %d B (era %d B)' %
              (k, w, h, im.get('mimeType'), img.size[0], img.size[1], len(buf.getvalue()), len(raw)))
    n_anim=len(js.get('animations',[]))   # se QUEDAN: son lo que el visor muestra
    usadas=set()
    for a in js.get('accessors',[]):
        if 'bufferView' in a: usadas.add(a['bufferView'])
        if 'sparse' in a:
            usadas.add(a['sparse']['indices']['bufferView'])
            usadas.add(a['sparse']['values']['bufferView'])
    for k, im in enumerate(js.get('images',[])):
        if 'bufferView' in im: usadas.add(im['bufferView'])
    nuevo=bytearray(); mapa={}; nuevas_vistas=[]
    for i, v in enumerate(js['bufferViews']):
        if i not in usadas: continue
        img_k=None
        for k, im in enumerate(js.get('images',[])):
            if im.get('bufferView')==i: img_k=k
        dat = nuevas_img[img_k] if (img_k is not None and nuevas_img[img_k]) else vista(js,bina,i)
        while len(nuevo)%4: nuevo.append(0)
        off=len(nuevo); nuevo += dat
        nv={'buffer':0, 'byteOffset':off, 'byteLength':len(dat)}
        if 'byteStride' in v and img_k is None: nv['byteStride']=v['byteStride']
        if 'target' in v: nv['target']=v['target']
        mapa[i]=len(nuevas_vistas); nuevas_vistas.append(nv)
    js['bufferViews']=nuevas_vistas
    for a in js.get('accessors',[]):
        if 'bufferView' in a: a['bufferView']=mapa[a['bufferView']]
        if 'sparse' in a:
            a['sparse']['indices']['bufferView']=mapa[a['sparse']['indices']['bufferView']]
            a['sparse']['values']['bufferView']=mapa[a['sparse']['values']['bufferView']]
    for k, im in enumerate(js.get('images',[])):
        if 'bufferView' in im:
            im['bufferView']=mapa[im['bufferView']]
            if nuevas_img[k]: im['mimeType']='image/jpeg'
    while len(nuevo)%4: nuevo.append(0)
    js['buffers']=[{'byteLength':len(nuevo)}]
    escribir(SAL, js, nuevo)
    print('animaciones conservadas: %d' % n_anim)
    print('%d B -> %d B  (%.1f%%)' % (antes, os.path.getsize(SAL), 100.0*os.path.getsize(SAL)/antes))

if __name__=='__main__':
    main()
