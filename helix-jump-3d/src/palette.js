/* STYLE FORMULA (unica para todo el juego, ver design/assets.csv):
   minimalismo arcade 3D — superficies planas de color exacto y sin iluminar, duotono
   saturado por tema sobre cielo degradado, volumen por silueta y sombra de contacto,
   halos aditivos en lugar de post-proceso, sin contornos.
   Los colores de aqui salen tal cual en pantalla: la torre no usa materiales PBR
   precisamente para que la paleta no se desvie.
   Ningun tema usa rojo: el rojo esta reservado a las plataformas letales. */

export const THEMES = [
  { sky:['#3ec6e0','#0f5c86'], core:'#f6f1e4', ring:'#ffd23f', accent:'#ffd23f' },
  { sky:['#8f7bf0','#2e2278'], core:'#f3eef7', ring:'#4dd6c8', accent:'#4dd6c8' },
  { sky:['#38d39f','#0a5b4a'], core:'#eef7f2', ring:'#ff8fd0', accent:'#ff8fd0' },
  { sky:['#ff9f45','#8d2f18'], core:'#fff3e6', ring:'#4fc3f7', accent:'#4fc3f7' },
  { sky:['#5c7cfa','#161f4f'], core:'#eef1fb', ring:'#a0e548', accent:'#a0e548' },
  { sky:['#ec5f8f','#57102e'], core:'#fdeef4', ring:'#ffe066', accent:'#ffe066' },
  { sky:['#26d0ce','#0b3a52'], core:'#e9f7f7', ring:'#c9a0ff', accent:'#c9a0ff' },
  { sky:['#2b3252','#0a0d1a'], core:'#dfe4ef', ring:'#18ffd5', accent:'#18ffd5' }
];

export const DANGER = '#e01b1b';
export const GOAL = '#7cff5c';
export const ARROW = '#5cff8f';
export const COIN = '#ffcf3d';

export const themeOf = level => THEMES[((level - 1) % THEMES.length + THEMES.length) % THEMES.length];
