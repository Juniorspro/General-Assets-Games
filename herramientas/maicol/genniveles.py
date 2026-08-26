# -*- coding: utf-8 -*-
"""Genera los siete niveles y COMPRUEBA que se puedan terminar antes de aceptarlos.
   Los primeros los escribi a mano y los siete tenian huecos de hasta NUEVE casillas cuando el salto
   llega a cuatro: ninguno se podia terminar. Un nivel de plataformas no se disena a ojo, se disena
   contra las medidas del salto — medidas en el juego: 280 px/s de tope, 111 px de alto (2,3
   casillas) y 187 px de largo (3,9). Aca los huecos nunca pasan de 3 y cada escalon sube 2."""
import random
from collections import deque

H=16; SUELO=11; FILA=10   # una fila MAS de tierra: sin mapa debajo, la camara no puede bajar y la
                          # linea de caminar se clava al 84% de la pantalla. Con 16 filas la camara
                          # tiene 192 px de recorrido y el suelo queda al 58%, que es donde va     # el piso ocupa de la 11 a la 14, se camina en la 10
# EL SUELO SUBE TRES FILAS Y SE ENGROSA. Estaba en la 13 con la 14 debajo: dos filas de tierra
# pegadas al borde de abajo del cuadro, o sea que el jugador caminaba raspando el marco y arriba
# quedaba una pantalla entera de cielo vacio. Con el piso de la 11 a la 14 hay 192 px de tierra
# visible y la linea de caminar queda a dos tercios de altura, que es donde va en un juego de
# plataformas.

def vacio(W): return [['.']*W for _ in range(H)]

def solido(g,i,j):
    W=len(g[0])
    if j<0 or j>=H: return False
    if i<0 or i>=W: return True
    return g[j][i] in '#-'
def pincho(g,i,j):
    W=len(g[0])
    return 0<=j<H and 0<=i<W and g[j][i]=='^'
def parado(g,i,j):
    W=len(g[0])
    return 0<=i<W and 0<=j<H and not solido(g,i,j) and solido(g,i,j+1) \
           and not solido(g,i,j-1) and not pincho(g,i,j) and not pincho(g,i,j-1)

def alcanzable(g, ini, meta):
    SUBE=3; LA=4; LC=6; CAE=9
    def acomodar(c):
        i,j=c
        while j<H-1 and not parado(g,i,j): j+=1
        return (i,j)
    a=acomodar(ini); b=acomodar(meta)
    if not parado(g,*a): return False,0
    vis={a}; q=deque([a])
    while q:
        i,j=q.popleft()
        v=[]
        for d in(-1,1):
            if parado(g,i+d,j): v.append((i+d,j))
        for dx in range(-LA,LA+1):
            for dy in range(-SUBE,1):
                if parado(g,i+dx,j+dy): v.append((i+dx,j+dy))
        for dx in range(-LC,LC+1):
            for dy in range(1,CAE+1):
                if parado(g,i+dx,j+dy): v.append((i+dx,j+dy)); break
        for c in v:
            if c not in vis: vis.add(c); q.append(c)
    return (b in vis), len(vis)

def armar(W, huecos, anchoMax, plataformas, slimes, bats, estrellas, pinches, resortes, moviles, rnd):
    g=vacio(W)
    # el piso, con huecos que SIEMPRE se pueden saltar
    for j in range(SUELO, H):
        for i in range(W): g[j][i]='#'
    cortes=[]
    i=8
    while len(cortes)<huecos and i < W-14:
        an=rnd.randint(2, anchoMax)
        cortes.append((i,an)); i += an + rnd.randint(6,11)
    for (a,an) in cortes:
        for d in range(an):
            for j in range(SUELO, H):
                if a+d < W: g[j][a+d]='.'
    # EL AIRE SOBRE CADA HUECO ES SAGRADO. Al saltar un hueco la cabeza barre desde la fila 11
    # hasta la 8; una plataforma ahi frena el salto en seco y el jugador cae al pozo. Se marcan las
    # columnas prohibidas: las del hueco y cuatro antes, que es desde donde se pega el salto.
    prohibidas=set()
    for (a,an) in cortes:
        for d in range(-5, an+3): prohibidas.add(a+d)
    # plataformas: a 3 filas o menos por encima de algo donde se pueda estar, o no se llega
    for _ in range(plataformas):
        for intento in range(60):
            an=rnd.randint(3,6); i=rnd.randint(4, W-an-10); j=rnd.choice([8,6,4,7,5])
            if any((i+d) in prohibidas for d in range(an)): continue
            if any(g[j][i+d]!='.' for d in range(an)): continue
            # DOS FILAS LIBRES ARRIBA, no una. El jugador mide 62 px y la casilla 48: parado sobre
            # una plataforma su cabeza llega a la fila j-2. Con una sola libre se generaban
            # plataformas apiladas donde NO SE PUEDE ESTAR PARADO, y el bot de prueba se encajaba
            # ahi y no salia mas — el nivel 7 se trababa siempre en la misma repisa.
            if any(g[j-1][i+d]!='.' for d in range(an)): continue
            if j>=2 and any(g[j-2][i+d]!='.' for d in range(an)): continue
            base=None
            for jj in range(j+1, min(H-1, j+4)):
                if any(solido(g,i+d,jj) for d in range(an)): base=jj; break
            if base is None or base-j>3: continue
            for d in range(an): g[j][i+d]='-'
            break
    def librePara(j,i):
        return g[j][i]=='.' and solido(g,i,j+1) and g[j-1][i]=='.' and (j<2 or g[j-2][i]=='.')
    def poner(car, cuantos, filas, desde=4, hasta=None):
        hasta = hasta if hasta is not None else W-10
        puestos=0
        for _ in range(cuantos*14):
            if puestos>=cuantos: break
            i=rnd.randint(desde,hasta); j=rnd.choice(filas)
            if not (0<j<H-1): continue
            if librePara(j,i) and all(g[j][max(0,i-2):i+3].count(c)==0 for c in '^sbM D'):
                g[j][i]=car; puestos+=1
        return puestos
    # ZONA SEGURA: nada de bichos ni pinches en las primeras 12 casillas ni en las ultimas 8.
    # El bot de prueba moria a las 113 pisadas en los niveles 4 y 5: habia un slime pegado al
    # arranque. Aparecer al lado de un enemigo no es dificultad, es una emboscada.
    poner('s', slimes, [FILA,8,6,4,7,5], 13, W-11)
    # los murcielagos vuelan: van en aire libre, no necesitan piso
    puestos=0
    for _ in range(bats*30):
        if puestos>=bats: break
        i=rnd.randint(13,W-12); j=rnd.choice([2,3,5,7,9])
        libre=all(g[j][x]=='.' for x in range(max(0,i-2), min(W,i+3)))
        if libre: g[j][i]='b'; puestos+=1
    # las estrellas: arriba de las plataformas, que es donde premian el salto
    puestos=0
    for _ in range(estrellas*20):
        if puestos>=estrellas: break
        i=rnd.randint(4,W-10); j=rnd.randint(1,11)
        if g[j][i]=='.' and g[j+1][i]=='-' :
            g[j][i]='*'; puestos+=1
    for _ in range(estrellas*20):
        if puestos>=estrellas: break
        i=rnd.randint(4,W-10); j=rnd.randint(1,11)
        if g[j][i]=='.' and any(g[j+k][i]!='.' for k in range(1,3)):
            g[j][i]='*'; puestos+=1
    # LOS PINCHES NO PUEDEN CORTAR EL CAMINO. Van de a uno o de a dos, sobre un tramo de piso de al
    # menos cinco casillas y con dos libres a cada lado: si no, tres pinches seguidos al borde de un
    # hueco dejan un tramo que no se puede saltar y el nivel se vuelve imposible.
    puestos=0
    for _ in range(pinches*160):
        if puestos>=pinches: break
        i=rnd.randint(14, W-16)
        if not all(solido(g,i+d,SUELO) for d in range(-2,4)): continue
        if not all(g[FILA][i+d]=='.' for d in range(-2,4)): continue
        # Y CUATRO FILAS DE AIRE ENCIMA, sobre todo el tramo del salto. Una plataforma arriba de un
        # pinche corta el salto en el aire y te deja caer JUSTO sobre el pinche: el bot se clavaba
        # siempre en la misma casilla del nivel 7. La cabeza llega a la fila FILA-4 en el apice.
        if not all(g[FILA-k][i+d]=='.' for k in range(1,5) for d in range(-2,4)
                   if 0 <= FILA-k < H and 0 <= i+d < W): continue
        an=1 if rnd.random()<0.55 else 2
        for d in range(an): g[FILA][i+d]='^'
        puestos+=an
    # RESORTES sobre piso firme: rompen la altura fija del salto y abren el camino de arriba
    puestos=0
    for _ in range(resortes*40):
        if puestos>=resortes: break
        i=rnd.randint(14, W-16)
        if not all(solido(g,i+d,SUELO) for d in range(-1,2)): continue
        if not all(g[FILA][i+d]=='.' for d in range(-2,3)): continue
        if not all(g[FILA-1][i+d]=='.' for d in range(-1,2)): continue
        if not all(g[FILA-2][i]=='.' for _ in [0]): continue
        g[FILA][i]='r'; puestos+=1
    # PLATAFORMAS MOVILES: van SOBRE un hueco, que es donde de verdad hacen falta
    puestos=0
    for (a,an) in cortes:
        if puestos>=moviles: break
        i=a
        if 12 < i < W-16 and all(g[FILA][i+d]=='.' for d in range(-1,an+1)) \
           and all(g[FILA-1][i+d]=='.' for d in range(-1,an+1)):
            g[FILA][i]='~'; puestos+=1
    # BANDERAS DE CONTROL a un tercio y a dos tercios: repetir medio nivel por un error es lo que
    # hace que alguien cierre el juego
    for frac in (0.36, 0.68):
        i=int(W*frac)
        for d in range(0, 12):
            for c in (i+d, i-d):
                if 12<c<W-12 and g[FILA][c]=='.' and solido(g,c,SUELO) and g[FILA-1][c]=='.':
                    g[FILA][c]='f'; break
            else: continue
            break
    g[FILA][0]='P'
    # la meta, en el ultimo tramo de piso firme
    mi=W-6
    while mi>4 and not (g[SUELO][mi]=='#' and g[FILA][mi]=='.'): mi-=1
    g[FILA][mi]='M' if False else 'D'
    return g, mi

def nivel(k, rnd):
    cfg=[ dict(W=64,huecos=2,anchoMax=2,plataformas=4,slimes=1,bats=0,estrellas=4,pinches=0,resortes=1,moviles=0),
          dict(W=66,huecos=3,anchoMax=2,plataformas=5,slimes=2,bats=1,estrellas=5,pinches=2,resortes=1,moviles=1),
          dict(W=68,huecos=3,anchoMax=3,plataformas=6,slimes=3,bats=2,estrellas=6,pinches=3,resortes=2,moviles=1),
          dict(W=70,huecos=4,anchoMax=3,plataformas=7,slimes=3,bats=3,estrellas=7,pinches=4,resortes=2,moviles=2),
          dict(W=72,huecos=4,anchoMax=3,plataformas=8,slimes=4,bats=3,estrellas=8,pinches=5,resortes=3,moviles=2),
          dict(W=74,huecos=5,anchoMax=3,plataformas=9,slimes=5,bats=4,estrellas=9,pinches=6,resortes=3,moviles=3),
          dict(W=76,huecos=5,anchoMax=3,plataformas=10,slimes=6,bats=5,estrellas=10,pinches=7,resortes=4,moviles=3) ][k]
    for intento in range(900):
        g,mi = armar(rnd=rnd, **cfg)
        ok,n = alcanzable(g, (0,FILA), (mi,FILA))
        if ok and n>cfg['W']*0.45:
            if k==6:
                for j in range(H):
                    for i in range(len(g[0])):
                        if g[j][i]=='D': g[j][i]='M'
            return g, n, intento+1
    raise SystemExit('nivel %d no salio'%(k+1))

if __name__=='__main__':
    import json, io, re
    rnd=random.Random(20260826)
    todos=[]
    for k in range(7):
        g,n,it=nivel(k,rnd)
        s=''.join(''.join(f) for f in g)
        print('nivel',k+1,'ancho',len(g[0]),'intentos',it,'casillas alcanzables',n,
              '| estrellas',s.count('*'),'slimes',s.count('s'),'bats',s.count('b'),'pinches',s.count('^'))
        todos.append([''.join(f) for f in g])
    p='/home/user/General-Assets-Games/juegos-pc/Maicol.html'
    h=io.open(p,encoding='utf8').read()
    m=re.search(r'const NIVELES=\[\n(.*?)\n\];\n', h, re.S)
    nuevo="const NIVELES=[\n"+",\n".join("["+",".join(json.dumps(f) for f in n)+"]" for n in todos)+"\n];\n"
    io.open(p,'w',encoding='utf8').write(h[:m.start()]+nuevo+h[m.end():])
    print('guardado')
