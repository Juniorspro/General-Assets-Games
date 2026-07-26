/* mapa mínimo sólo para el humo del motor (no entra al build final) */
HP.map('smoke','Smoke',{size:120,ground:'grass',wall:8,sky:'city',
  fogColor:0xc4d2dc,fogNear:120,fogFar:400,sun:[70,110,50],amb:.6,
  spawns:[[0,1.2,16,180],[10,1.2,-10,0]],
  water:[{p:[24,-.5,-24],d:[20,3,16]}],
  parts:[
    {s:'box',d:[40,1,30],p:[0,.5,0],m:'concrete'},
    {s:'box',d:[12,6,.6],p:[-14,3,-12],m:'brick'},
    {s:'box',d:[8,.5,6],p:[10,3,-6],m:'steel'},
    {s:'cyl',d:[.3,9],p:[16,4.5,10],m:'steel',nc:1}
  ]});
