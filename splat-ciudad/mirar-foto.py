"""Renderiza UN fotograma de la escena como foto, para mirarlo y decidir.

El splat no puede ser más realista que las fotos con las que se pinta, así que
antes de tocar el proyector conviene mirar una toma sola, a resolución de
verdad y con curva de cámara —AgX, no Standard—, que es lo que se ve con el ojo.
"""
import bpy, math, sys

PX = int(sys.argv[sys.argv.index("--px")+1]) if "--px" in sys.argv else 1280
SP = int(sys.argv[sys.argv.index("--muestras")+1]) if "--muestras" in sys.argv else 256
SAL = sys.argv[sys.argv.index("--salida")+1] if "--salida" in sys.argv else "/home/neko/foto-ref.png"
OJO = [float(v) for v in sys.argv[sys.argv.index("--ojo")+1].split(",")]
BLA = [float(v) for v in sys.argv[sys.argv.index("--blanco")+1].split(",")]
LEN = float(sys.argv[sys.argv.index("--lente")+1]) if "--lente" in sys.argv else 35.0

esc = bpy.context.scene
esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = SP
esc.cycles.use_adaptive_sampling = True
esc.cycles.adaptive_threshold = 0.008
esc.cycles.max_bounces = 6
esc.cycles.transmission_bounces = 4
esc.render.resolution_x = PX
esc.render.resolution_y = int(PX*9/16)
esc.render.resolution_percentage = 100
esc.render.film_transparent = False
esc.render.filepath = SAL
esc.render.image_settings.file_format = "PNG"
# acá sí curva de cámara: esto es para mirar, no para proyectar
try: esc.view_settings.view_transform = "AgX"
except TypeError: esc.view_settings.view_transform = "Filmic"
esc.view_layers[0].use_pass_z = False
if esc.use_nodes:
    esc.use_nodes = False

cam = bpy.data.cameras.new("ref"); cam.lens = LEN
ob = bpy.data.objects.new("ref", cam)
bpy.context.collection.objects.link(ob)
esc.camera = ob
ob.location = OJO
# apuntar al blanco
import mathutils
d = mathutils.Vector(BLA) - mathutils.Vector(OJO)
ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
print("REF: %dx%d, %d muestras, lente %d mm" % (PX, esc.render.resolution_y, SP, LEN), flush=True)
bpy.ops.render.render(write_still=True)
print("REF: listo %s" % SAL, flush=True)
