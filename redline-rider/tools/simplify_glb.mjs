/* Reduce la malla de un GLB conservando su silueta.

   image_to_3d no da una densidad constante: medido en los seis vehiculos del juego, el
   sedan, el camion y el autobus salen a unos 3.000 triangulos y el SUV y la furgoneta a
   29.800, diez veces mas, para coches que se ven de espaldas y a distancia. Con hasta 22
   vehiculos en el pool esa diferencia se nota en una GPU de movil, y no aporta nada.

   Se usa el simplificador de meshoptimizer, que colapsa aristas por error cuadrico: respeta
   la silueta, que es lo unico que se distingue a esa distancia. El error se pide como
   fraccion del tamano del modelo, no como numero de triangulos, porque el limite util es
   "cuanto se nota", no "cuantos hay".

   Uso:  node tools/simplify_glb.mjs entrada.glb salida.glb [ratio] [error]
     ratio  fraccion de triangulos objetivo (0,25 por omision)
     error  desviacion maxima admitida, en fraccion del tamano (0,004 por omision)
*/
import { NodeIO } from '@gltf-transform/core';
import { simplify, weld, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { stat } from 'node:fs/promises';

const [inPath, outPath, ratioArg, errorArg] = process.argv.slice(2);
if (!inPath || !outPath){
  console.error('uso: node tools/simplify_glb.mjs entrada.glb salida.glb [ratio] [error]');
  process.exit(1);
}
const ratio = ratioArg ? +ratioArg : 0.25;
const error = errorArg ? +errorArg : 0.004;

await MeshoptSimplifier.ready;

const io = new NodeIO();
const doc = await io.read(inPath);

const count = () => {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()){
      const idx = prim.getIndices();
      tris += idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3;
    }
  return Math.round(tris);
};

const before = count();

/* weld ANTES de simplificar y no despues: el GLB llega con los vertices partidos por
   costura de UV y de normal, asi que dos caras contiguas no comparten vertice y el
   simplificador no ve ninguna arista que colapsar. Sin esto el recuento no baja. */
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error }),
  dedup(),
  prune()
);

const after = count();
await io.write(outPath, doc);

const kb = n => (n / 1024).toFixed(0) + ' KB';
const a = (await stat(inPath)).size, b = (await stat(outPath)).size;
console.log(`${inPath} -> ${outPath}`);
console.log(`  triangulos ${before} -> ${after} (${(100 - after / before * 100).toFixed(0)}% menos)`);
console.log(`  fichero    ${kb(a)} -> ${kb(b)} (${(100 - b / a * 100).toFixed(0)}% menos)`);
