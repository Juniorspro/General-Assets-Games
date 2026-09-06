# -*- coding: utf-8 -*-
"""El menu de Maicol en estilo consola de 16 bits.
   Nada de bordes de un pixel ni sombras difusas: en una consola de 16 bits no habia ni una cosa ni
   la otra. Marcos hechos con escalones de box-shadow, sombras de texto duras y desplazadas, damero
   que se desliza de fondo, y todo en multiplos de 4 px, que es lo que da el aire de rejilla."""
import io, sys
p=sys.argv[1] if len(sys.argv)>1 else '/home/user/General-Assets-Games/juegos-pc/Maicol.html'
s=io.open(p,encoding='utf8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n, (s.count(a), repr(a[:70]))
    s=s.replace(a,b)

rep("  #menu{ z-index:40; background:radial-gradient(ellipse at 50% 40%, #1b2740 0%, #0a0d14 70%); }",
"""  /* ---------- EL MENU, DE 16 BITS ---------- */
  #menu{ z-index:40; background:#1a1040; overflow:hidden; image-rendering:pixelated; }
  #menu::before{ content:''; position:absolute; inset:-40px;
    background:
      repeating-linear-gradient(45deg, rgba(255,255,255,.030) 0 8px, rgba(0,0,0,0) 8px 16px),
      repeating-linear-gradient(-45deg, rgba(120,90,255,.055) 0 8px, rgba(0,0,0,0) 8px 16px),
      radial-gradient(ellipse at 50% 34%, #3a2280 0%, #1a1040 58%, #0d0824 100%);
    animation:damero 22s linear infinite; }
  @keyframes damero{ to{ transform:translate(32px,32px); } }
  #menu::after{ content:''; position:absolute; inset:0; pointer-events:none;
    background-image:
      radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,.75) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 78% 12%, rgba(255,255,255,.55) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 34% 76%, rgba(255,255,255,.45) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 88% 62%, rgba(255,255,255,.60) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 58% 30%, rgba(255,255,255,.35) 50%, transparent 51%);
    animation:titila 3.2s steps(2) infinite; }
  @keyframes titila{ 50%{ opacity:.35; } }""")

rep("""  #tit{ font-size:clamp(38px,9vw,92px); font-weight:900; letter-spacing:.14em; line-height:1;
    color:#ffd76a; text-shadow:0 6px 0 #b8791d, 0 10px 26px rgba(0,0,0,.7); }""",
"""  #tit{ position:relative; z-index:2;
    font-size:clamp(36px,8.6vw,88px); font-weight:900; letter-spacing:.16em; line-height:1;
    color:#ffd23f; -webkit-text-stroke:4px #1a1040; paint-order:stroke fill;
    text-shadow:4px 4px 0 #c4531f, 8px 8px 0 #7a2a12; }""")

rep("""  #sub{ font-size:max(10px,calc(12px * var(--esc,1))); font-weight:700; letter-spacing:.24em;
    color:#8fa6c4; text-transform:uppercase; padding:0 20px; }""",
"""  #sub{ position:relative; z-index:2;
    font-size:max(10px,calc(12px * var(--esc,1))); font-weight:800; letter-spacing:.28em;
    color:#a9c0ff; text-transform:uppercase; padding:0 20px; text-shadow:2px 2px 0 #1a1040; }""")

rep("""  .bt{ padding:clamp(10px,1.4vw,16px) clamp(30px,5vw,64px); border-radius:999px; cursor:pointer;
    font-size:max(12px,calc(14px * var(--esc,1))); font-weight:900; letter-spacing:.18em;
    color:#0a0d14; background:#ffd76a; border:0; box-shadow:0 5px 0 #b8791d;
    transition:transform .1s ease, box-shadow .1s ease; }
  .bt:active{ transform:translateY(4px); box-shadow:0 1px 0 #b8791d; }
  .bt2{ background:transparent; color:#cfe0f2; border:1.4px solid rgba(207,224,242,.4); box-shadow:none; }
  .bt2:active{ transform:scale(.96); box-shadow:none; }""",
"""  .bt{ position:relative; z-index:2;
    padding:clamp(9px,1.3vw,15px) clamp(26px,4.4vw,56px); border-radius:0; cursor:pointer;
    font-size:max(12px,calc(14px * var(--esc,1))); font-weight:900; letter-spacing:.20em;
    color:#2a1206; background:#ffd23f; border:0;
    box-shadow: 0 0 0 4px #1a1040, 0 0 0 8px #ffeaa0, 0 8px 0 8px #1a1040;
    transition:transform .08s steps(1), box-shadow .08s steps(1); }
  .bt:active{ transform:translateY(6px); box-shadow:0 0 0 4px #1a1040, 0 0 0 8px #ffeaa0, 0 2px 0 8px #1a1040; }
  .bt2{ background:#3a2a86; color:#e6ecff;
    box-shadow: 0 0 0 4px #1a1040, 0 0 0 8px #7f6ae0, 0 8px 0 8px #1a1040; }
  .bt2:active{ transform:translateY(6px); box-shadow:0 0 0 4px #1a1040, 0 0 0 8px #7f6ae0, 0 2px 0 8px #1a1040; }""")

rep("""  #niveles{ display:flex; gap:clamp(6px,1vw,12px); flex-wrap:wrap; justify-content:center; max-width:88%; }
  .niv{ width:max(38px,calc(46px * var(--esc,1))); height:max(38px,calc(46px * var(--esc,1)));
    border-radius:12px; border:1.6px solid rgba(255,215,106,.35); background:rgba(255,215,106,.08);
    color:#ffd76a; font-size:max(13px,calc(16px * var(--esc,1))); font-weight:900; cursor:pointer; }
  .niv.hecho{ background:#ffd76a; color:#0a0d14; border-color:#ffd76a; }
  .niv.trabado{ opacity:.30; cursor:default; border-color:rgba(255,255,255,.2); color:#8fa6c4;
    background:transparent; }""",
"""  #niveles{ position:relative; z-index:2; display:flex; gap:clamp(8px,1.3vw,16px); flex-wrap:wrap;
    justify-content:center; max-width:90%; padding:4px; }
  .niv{ width:max(36px,calc(44px * var(--esc,1))); height:max(36px,calc(44px * var(--esc,1)));
    border-radius:0; border:0; background:#241a5e; color:#a9c0ff;
    box-shadow:0 0 0 3px #1a1040, 0 0 0 6px #4a3aa0;
    font-size:max(13px,calc(17px * var(--esc,1))); font-weight:900; cursor:pointer;
    transition:transform .08s steps(1); }
  .niv:active{ transform:translateY(3px); }
  .niv.hecho{ background:#ffd23f; color:#2a1206; box-shadow:0 0 0 3px #1a1040, 0 0 0 6px #ffeaa0; }
  .niv.trabado{ background:#1d1546; color:#4b4383; cursor:default;
    box-shadow:0 0 0 3px #1a1040, 0 0 0 6px #2b2360; }""")

rep("""  #cuento{ font-size:max(11px,calc(13px * var(--esc,1))); line-height:1.7; color:#c6d6e8;
    max-width:min(560px,84%); }""",
"""  #cuento{ position:relative; z-index:2;
    font-size:max(11px,calc(13px * var(--esc,1))); line-height:1.75; color:#e6ecff;
    max-width:min(560px,86%); background:#241a5e; padding:clamp(10px,1.5vw,18px) clamp(14px,2vw,24px);
    box-shadow:0 0 0 4px #1a1040, 0 0 0 8px #7f6ae0, 8px 8px 0 8px rgba(10,6,32,.55);
    text-align:left; }
  #cuento b{ color:#ffd23f; }""")

rep("  #pie{ font-size:max(9px,calc(10px * var(--esc,1))); letter-spacing:.20em; color:#4a5c74; }",
"""  #pie{ position:relative; z-index:2;
    font-size:max(9px,calc(10px * var(--esc,1))); letter-spacing:.20em; color:#6b7bb8;
    animation:parpadeo 1.6s steps(2) infinite; }
  @keyframes parpadeo{ 50%{ opacity:.45; } }""")

rep("  #idioma{ z-index:50; background:#0a0d14; }",
"""  #idioma{ z-index:50; background:#1a1040; }
  #idioma::before{ content:''; position:absolute; inset:-40px;
    background:repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 8px, rgba(0,0,0,0) 8px 16px),
               radial-gradient(ellipse at 50% 40%, #3a2280 0%, #1a1040 60%, #0d0824 100%);
    animation:damero 22s linear infinite; }""")

rep("""  #finTit{ font-size:clamp(24px,5.4vw,54px); font-weight:900; letter-spacing:.10em; color:#ffd76a;
    text-shadow:0 4px 0 #b8791d; }
  #finSub{ font-size:max(11px,calc(13px * var(--esc,1))); color:#c6d6e8; letter-spacing:.06em; }""",
"""  #finTit{ font-size:clamp(22px,5vw,50px); font-weight:900; letter-spacing:.12em; color:#ffd23f;
    -webkit-text-stroke:3px #1a1040; paint-order:stroke fill;
    text-shadow:3px 3px 0 #c4531f, 6px 6px 0 #7a2a12; }
  #finSub{ font-size:max(11px,calc(13px * var(--esc,1))); color:#e6ecff; letter-spacing:.06em;
    background:#241a5e; padding:10px 18px;
    box-shadow:0 0 0 4px #1a1040, 0 0 0 8px #7f6ae0; }""")
rep("  #fin{ z-index:45; background:rgba(6,9,16,.92); display:none; }",
    "  #fin{ z-index:45; background:rgba(13,8,36,.94); display:none; }")
io.open(p,'w',encoding='utf8').write(s)
print('menu snes aplicado')
