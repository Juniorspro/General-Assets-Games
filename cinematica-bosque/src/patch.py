#!/usr/bin/env python3
"""Splices the forest cinematic (scenes 1 and 2) into lacasadelavieja7.html."""
import base64, json, os, re, sys

SRC = "/root/.claude/uploads/7184cbee-c46c-5dcd-976a-793758168571/ec4d2c6c-lacasadelavieja7.html"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/General-Assets-Games/lacasadelavieja9.html"
AST = "/home/user/lemi-game/assets/dist"
HERE = os.path.dirname(os.path.abspath(__file__))

def durl(path, mime):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

TXT = {
    "es": {
        "office1": "Buenas noches. Tenemos un trabajo para usted. Limpieza y remodelación completa de una casa.",
        "office2": "La dueña es una señora mayor, vive sola allá en el bosque. El pago es el doble de lo habitual.",
        "accept": "Acepto.",
        "hello": "\u00bfHola?",
        "caller": "\u00bfHablo con el encargado de la remodelaci\u00f3n?",
    },
    "en": {
        "office1": "Good evening. We have a job for you. A full cleaning and remodeling of a house.",
        "office2": "The owner is an elderly lady, she lives alone out in the woods. The pay is double the usual.",
        "accept": "I'll take it.",
        "hello": "Hello?",
        "caller": "Am I speaking with the man who does the remodeling?",
    },
    "pt": {
        "office1": "Boa noite. Temos um trabalho para você. Limpeza e reforma completa de uma casa.",
        "office2": "A dona é uma senhora idosa, mora sozinha lá na floresta. O pagamento é o dobro do normal.",
        "accept": "Eu aceito.",
        "hello": "Al\u00f4?",
        "caller": "Falo com o respons\u00e1vel pela reforma?",
    },
}
VOT = {"es": {"office": 14.66, "accept": 0.79, "hello": 0.43, "caller": 2.35},
       "en": {"office": 11.45, "accept": 0.74, "hello": 1.70, "caller": 2.18},
       "pt": {"office": 12.67, "accept": 2.26, "hello": 1.30, "caller": 2.45}}

def preamble():
    vo = {}
    for lang in ("es", "en", "pt"):
        vo[lang] = {"office": durl(f"{AST}/vo_office_{lang}.mp3", "audio/mpeg"),
                    "accept": durl(f"{AST}/vo_player_{lang}.mp3", "audio/mpeg"),
                    "hello": durl(f"{AST}/vo_hello_{lang}.mp3", "audio/mpeg"),
                    "caller": durl(f"{AST}/vo_caller_{lang}.mp3", "audio/mpeg")}
    parts = [
        'var CDLV_CAR_BODY=%s;' % json.dumps(durl(f"{AST}/car_body.glb", "model/gltf-binary")),
        'var CDLV_CAR_WHEEL=%s;' % json.dumps(durl(f"{AST}/car_wheel.glb", "model/gltf-binary")),
        'var CDLV_PHONE=%s;' % json.dumps(durl(f"{AST}/phone.glb", "model/gltf-binary")),
        'var CDLV_OFFICE=%s;' % json.dumps(durl(f"{AST}/office.jpg", "image/jpeg")),
        'var CDLV_GRASS=%s;' % json.dumps(durl(f"{AST}/grass_card.webp", "image/webp")),
        'var CDLV_LEAF=%s;' % json.dumps(durl(f"{AST}/leaf_card.webp", "image/webp")),
        'var CDLV_BARK=%s;' % json.dumps(durl(f"{AST}/bark.jpg", "image/jpeg")),
        'var CDLV_SKY=%s;' % json.dumps(durl(f"{AST}/sky.jpg", "image/jpeg")),
        'var CDLV_OLD_LADY=%s;' % json.dumps(durl(f"{AST}/vieja.glb", "model/gltf-binary")),
        'var CDLV_MUSIC=%s;' % json.dumps(durl(f"{AST}/music.mp3", "audio/mpeg")),
        'var CDLV_CRASH=%s;' % json.dumps(durl(f"{AST}/crash.mp3", "audio/mpeg")),
        'var CDLV_VO=%s;' % json.dumps(vo),
        'var CDLV_TXT=%s;' % json.dumps(TXT, ensure_ascii=False),
        'var CDLV_VOT=%s;' % json.dumps(VOT),
        'var CDLV_LANG=(()=>{try{let l=String(window.__CDLV_LANG||navigator.language||"es").slice(0,2).toLowerCase();'
        'return l==="en"||l==="pt"?l:"es"}catch(e){return "es"}})();',
    ]
    return "\n" + "\n".join(parts) + "\n"

# se aplican a todo el archivo, no solo a la clase de la cinematica
GLOBAL_REPLACEMENTS = [
    # los rigs de Tripo miran a +X y todo el juego asume +Z (por eso la vieja
    # caminaba de costado): se corrige de una vez en el helper del rig
    ("t.scale.setScalar(A/Math.max(s.y,.001)),t.traverse(",
     "t.scale.setScalar(A/Math.max(s.y,.001)),t.rotation.y=-Math.PI/2,t.traverse("),
]

REPLACEMENTS = [
    # 1. constructor: fields + new builders
    ("this.resolveLandmarks(),this.buildRoad(),this.buildExterior(),this.buildShots()",
     "this.fogSheets=[],this.grass=null,this.dust=null,this.sky=null,this.split=null,this.povRig=null,"
     "this.driverRig=null,this.phoneHolder=null,this.vo=null,this._v1=new Y,this._v2=new Y,this._v3=new Y,"
     "this.startWind(),this.resolveLandmarks(),this.buildRoad(),this.buildExterior(),this.buildForest(),"
     "this.buildGrass(),this.buildSky(),this.buildDust(),this.loadCarModel(),this.buildRigs(),this.loadOldLady(),"
     "this.buildSplit(),this.buildCrashTree(),this.wireSkipButton(),this.buildShots()"),
    # 2b. asfalto y banquina un poco mas claros para que se lean de noche
    ("t=new _A({color:1316122,roughness:.95})", "t=new _A({color:2238250,roughness:.95})"),
    ("o=new _A({color:1711126,roughness:1})", "o=new _A({color:2828834,roughness:1})"),
    # 2. carretera y suelo mucho mas largos (para que no se vea el borde)
    ("T=new fA(new k9(150,7.6),t)", "T=new fA(new k9(300,7.6),t)"),
    ("for(let z=-66;z<66;z+=6)", "for(let z=-145;z<145;z+=6)"),
    ("j=new fA(new k9(170,95),o)", "j=new fA(new k9(330,95),o)"),
    ("g.position.set(D.range(-72,72),0,", "g.position.set(D.range(-145,145),0,"),
    ("v=new fA(new k9(240,240),g)", "v=new fA(new k9(420,420),g)"),
    # 3. buildCar: agrupar la version procedural para poder ocultarla
    ("return this.disposers.push(()=>{A.traverse(g=>g.isMesh&&g.geometry.dispose()),[P,D,i,t].forEach(g=>g.dispose())}),{group:A,wheels:j,lights:z}",
     "let pr=new eP;for(let c of A.children.slice())pr.add(c);A.add(pr);"
     "return this.disposers.push(()=>{A.traverse(g=>g.isMesh&&g.geometry.dispose()),[P,D,i,t].forEach(g=>g.dispose())}),"
     "{group:A,proc:pr,wheels:j,lights:z}"),
    # 4. look(): iluminacion y niebla del bosque
    ('}=this.deps;A==="day"?',
     '}=this.deps;this.sky&&(this.sky.visible=A!=="night-interior"),A==="forest-night"?('
     'D.intensity=1.15,D.color.set(2899292),D.groundColor.set(1316892),'
     'P.intensity=3.4,P.color.set(13228287),t.intensity=0,'
     # la luna proyecta: sin esto los arboles y el auto flotan sobre el asfalto
     'P.castShadow=!0,P.shadow.mapSize.setScalar(2048),P.shadow.bias=-.0009,'
     'P.shadow.camera.left=-70,P.shadow.camera.right=70,P.shadow.camera.top=70,'
     'P.shadow.camera.bottom=-70,P.shadow.camera.near=1,P.shadow.camera.far=300,'
     'P.shadow.camera.updateProjectionMatrix(),'
     # niebla mas abierta: la silueta tiene que leerse a 40 m
     'i.fog.color.set(1712432),i.fog.near=9,i.fog.far=118,'
     'i.background.set(1712432)):A==="day"?'),
    # 5. insertar las escenas nuevas al principio
    ('this.shots=[{id:"road-talk"', 'this.shots=this.introShots(A,P,D,i,t).concat([{id:"road-talk"'),
    ('P.set({fade:(s-.7)/.3})}}]}start(){', 'P.set({fade:(s-.7)/.3})}}])}start(){'),
    # 6b. hook de debug/salto de escena en cada frame
    ("update(A){if(this.finished)return;this.elapsed+=A,this.shotTime+=A,",
     "update(A){if(this.finished)return;this.dbg(),this.elapsed+=A,this.shotTime+=A,"),
    # 7. finish/dispose limpian lo nuevo
    ("finish(){this.finished=!0,this.engine?.stop()",
     "finish(){this.finished=!0,this.splitHide(),this.stopVo(),this.stopMusic(),"
     "this.povRig&&(this.povRig.root.visible=!1),this.driverRig&&(this.driverRig.root.visible=!1),"
     "this.phoneHolder&&(this.phoneHolder.visible=!1),this.grass&&(this.grass.visible=!1),"
     "this.dust&&(this.dust.mesh.visible=!1),this.engine?.stop()"),
    ("dispose(){this.rig?.dispose()",
     "dispose(){this.splitHide(),this.split&&this.split.wrap.remove(),this.stopVo(),"
     "this.forest&&this.deps.scene.remove(this.forest),this.rig?.dispose()"),
]


def main():
    src = open(SRC, encoding="utf-8").read()
    start = src.index("As=class{")
    end = src.index("};var XP=", start) + 1          # index just past the closing brace
    cls = src[start:end]
    assert cls.endswith("}"), cls[-40:]

    for i, (old, new) in enumerate(REPLACEMENTS):
        n = cls.count(old)
        if n != 1:
            raise SystemExit("replacement %d matched %d times: %r" % (i, n, old[:70]))
        cls = cls.replace(old, new)

    def cut(text, frm, to, ins=""):
        a = text.index(frm); b = text.index(to)
        assert a < b, (frm, to)
        return text[:a] + ins + text[b:]

    # El orden original era:
    #   road-talk road-car title arrival montage strange wake descent sheet reveal chase hide
    # Ahora la intro es el choque, asi que todo lo que iba entre el titulo y la
    # persecucion (llegar en auto, el montaje de dias, el sotano, la sabana)
    # sobra: el chico se despierta en la casa directamente despues del golpe.
    cls = cut(cls, '{id:"road-talk"', '{id:"title"')
    cls = cut(cls, '{id:"arrival"', '{id:"chase"', "...this.houseShots(A,P,D,i),")

    methods = open(os.path.join(HERE, "methods.js"), encoding="utf-8").read()
    shots = open(os.path.join(HERE, "shots.js"), encoding="utf-8").read()
    cls = cls[:-1] + "\n" + methods + "\n" + shots + "\n}"

    ins = src.index('var lj="LA CASA DE LA VIEJA"')
    assert ins < start
    out = src[:ins] + preamble() + src[ins:start] + cls + src[end:]
    for i, (old, new) in enumerate(GLOBAL_REPLACEMENTS):
        n = out.count(old)
        if n != 1:
            raise SystemExit("global replacement %d matched %d times: %r" % (i, n, old[:70]))
        out = out.replace(old, new)
    open(OUT, "w", encoding="utf-8").write(out)
    print("wrote", OUT, len(out), "chars (was", len(src), ")")


main()
