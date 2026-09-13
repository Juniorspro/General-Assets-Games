const S = window.__S, H = S.H, P = S.POI.oasis;
const fil = [];
for (let dz = -40; dz <= 40; dz += 10){
  const r = [];
  for (let dx = -40; dx <= 40; dx += 10) r.push(+H(P.x + dx, P.z + dz).toFixed(1));
  fil.push(r.join(' '));
}
/* perfil de la vaguada del arroyo, perpendicular a su eje, por el centro */
const perf = [];
for (let s = -120; s <= 120; s += 15){
  const x = s * 0.42, z = -s * 0.91;    /* normal al eje v = .42x - .91z */
  perf.push(s + ':' + H(x, z).toFixed(1));
}
return { oasisH: +H(P.x, P.z).toFixed(2), agua: +(H(P.x, P.z) + 0.55).toFixed(2),
  malla: fil, vaguada: perf.join(' '),
  pozo: S.pozo(), arboles: window.__ARBOLES, props: S.props() };
