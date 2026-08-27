/* alturas del terreno en las torres candidatas de la ruta de las copas */
const S = window.__S, H = S.H;
const P = { A: [-79, 44], B: [-60, -17], C: [-64, -84], L: [0, -132] };
const out = {};
for (const k in P){
  const p = P[k];
  out[k] = { h: +H(p[0], p[1]).toFixed(1),
    /* pendiente alrededor, para no plantar una torre en un barranco */
    pend: +Math.max(Math.abs(H(p[0] + 4, p[1]) - H(p[0] - 4, p[1])),
      Math.abs(H(p[0], p[1] + 4) - H(p[0], p[1] - 4))).toFixed(2),
    dRuinas: Math.round(Math.hypot(p[0] - S.POI.ruinas.x, p[1] - S.POI.ruinas.z)),
    dOasis: Math.round(Math.hypot(p[0] - S.POI.oasis.x, p[1] - S.POI.oasis.z)) };
}
/* y el perfil del terreno debajo de cada cable, cada 8 m */
const perf = {};
for (const [n, a, b] of [['AB', P.A, P.B], ['BC', P.B, P.C], ['CL', P.C, P.L]]){
  const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const l = [];
  for (let t = 0; t <= 1.001; t += 8 / L2)
    l.push(Math.round(H(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)));
  perf[n] = 'len' + Math.round(L2) + ' ' + l.join(' ');
}
return { torres: out, perfil: perf };
