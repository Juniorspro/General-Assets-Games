/* busca el radio mas chico donde el terreno ya tapa el canto del disco de agua */
const S = window.__S, H = S.H, P = S.POI.oasis;
const NIV = H(P.x, P.z) + 0.55;
const out = {};
for (let r = 13; r <= 26; r += 1){
  let peor = 99;
  for (let a = 0; a < 6.283; a += 0.13)
    peor = Math.min(peor, H(P.x + Math.cos(a) * r, P.z + Math.sin(a) * r) - NIV);
  out[r] = +peor.toFixed(2);
}
return { nivel: +NIV.toFixed(2), margenPorRadio: out };
