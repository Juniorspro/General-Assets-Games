/* de donde salen los triangulos: para decidir que se puede sacar del reflejo */
const S = window.__S;
const acu = {};
S.scene.traverse(o => {
  if (!o.isMesh && !o.isInstancedMesh) return;
  const g = o.geometry; if (!g) return;
  const n = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3;
  const k = (o.isInstancedMesh ? 'INST ' : '') + (o.name || o.material && o.material.type || 'anon')
    + ' x' + (o.count || 1);
  acu[k] = (acu[k] || 0) + n * (o.count || 1);
});
const lista = Object.entries(acu).sort((a, b) => b[1] - a[1]).slice(0, 18)
  .map(e => e[0] + ' = ' + Math.round(e[1]));
return lista;
