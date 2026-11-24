"""Rig v1 - estudio de podcast 3D procedural (sem assets de terceiros).
Uso: blender -b --python tools/rig/build_studio.py [-- --no-render]
Reconstroi tudo do zero: cena, .blend, plates (clean/green/mask) e rig.json.
"""
import bpy, sys, json, math, time
import numpy as np
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "rig-v1"
PLATES = OUT / "plates"
RENDER = "--no-render" not in sys.argv
ORANGE = (1.0, 0.114, 0.014, 1)  # #FF5F1F em linear aprox.

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- helpers ----------
def mat(name, color=(0.05, 0.05, 0.05, 1), rough=0.6, metal=0.0, emit=None, emit_strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = emit
        b.inputs["Emission Strength"].default_value = emit_strength
    return m

def emission_mat(name, color, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); o = nt.nodes.new("ShaderNodeOutputMaterial")
    e.inputs["Color"].default_value = color; e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], o.inputs[0])
    return m

def assign(o, m):
    o.data.materials.clear(); o.data.materials.append(m)
    return o

def box(name, loc, size, m):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object
    o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    return assign(o, m)

def sphere(name, loc, scale, m):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, segments=32, ring_count=16); o = bpy.context.object
    o.name = name; o.scale = scale
    bpy.ops.object.shade_smooth()
    return assign(o, m)

def tube(name, a, b, r, m):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=16); o = bpy.context.object
    o.name = name; o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return assign(o, m)

def look_euler(pos, target, roll_up=(0, 0, 1)):
    d = Vector(target) - Vector(pos)
    return d.to_track_quat("-Z", "Y").to_euler()

def area(name, loc, target, power, size, color):
    L = bpy.data.lights.new(name, "AREA"); L.energy = power; L.size = size; L.color = color
    o = bpy.data.objects.new(name, L); scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = look_euler(loc, target)
    return o

# ---------- materials ----------
M_BLACK = mat("black", (0.012, 0.012, 0.012, 1), 0.8)
M_CHAR = mat("charcoal", (0.045, 0.045, 0.05, 1), 0.95)
M_FOAM_O = mat("foam_orange", (0.80, 0.16, 0.02, 1), 0.95)
M_FOAM_K = mat("foam_black", (0.02, 0.02, 0.02, 1), 0.95)
M_FLOOR = mat("floor", (0.03, 0.03, 0.03, 1), 0.7)
M_GREY = mat("mannequin_grey", (0.35, 0.35, 0.36, 1), 0.7)
M_CHAIR = mat("chair", (0.025, 0.025, 0.028, 1), 0.7)
M_METAL = mat("metal", (0.03, 0.03, 0.03, 1), 0.35, 0.9)
M_LED = emission_mat("led_orange", ORANGE, 3.0)
# madeira procedural (noise -> mistura de dois marrons)
M_WOOD = bpy.data.materials.new("wood"); M_WOOD.use_nodes = True
nt = M_WOOD.node_tree; b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.4
tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1, 14, 1)
ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 6; ns.inputs["Detail"].default_value = 8
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.16, 0.06, 0.02, 1); ramp.color_ramp.elements[1].color = (0.30, 0.13, 0.05, 1)
nt.links.new(tc.outputs["Object"], mp.inputs[0]); nt.links.new(mp.outputs[0], ns.inputs["Vector"])
nt.links.new(ns.outputs["Fac"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs["Base Color"])

# ---------- sala ----------
box("FLOOR", (0, -2, -0.05), (16, 16, 0.1), M_FLOOR)
box("WALL_BACK", (0, 3.25, 4), (16, 0.1, 8), M_BLACK)
box("WALL_SIDE_L", (-7, -1, 4), (0.1, 16, 8), M_BLACK)
box("WALL_SIDE_R", (7, -1, 4), (0.1, 16, 8), M_BLACK)
# espuma acustica: grade 0.6 m, laranja/preto/grafite (determinista)
import random
rnd = random.Random(7)
for ix in range(-9, 10):
    for iz in range(0, 8):
        r = rnd.random()
        m = M_FOAM_O if r < 0.34 else (M_FOAM_K if r < 0.67 else M_CHAR)
        box(f"FOAM_{ix}_{iz}", (ix * 0.6, 3.15, 0.3 + iz * 0.6), (0.57, 0.1, 0.57), m)
box("LED_WALL_BASE", (0, 3.08, 0.05), (10.5, 0.03, 0.05), M_LED)
box("LED_WALL_TOP", (0, 3.08, 5.15), (10.5, 0.03, 0.05), M_LED)

# ---------- telas ----------
def screen(tag, cx, cz, w, h):
    y = 3.0 - 0.055  # frente da moldura
    box(f"BEZEL_{tag}", (cx, 3.0, cz), (w + 0.1, 0.1, h + 0.1), M_BLACK)
    hw, hh = w / 2, h / 2
    corners = [(cx - hw, y, cz + hh), (cx + hw, y, cz + hh), (cx + hw, y, cz - hh), (cx - hw, y, cz - hh)]  # TL,TR,BR,BL
    me = bpy.data.meshes.new(f"SCREEN_{tag}")
    me.from_pydata(corners, [], [(0, 3, 2, 1)]); me.update()
    o = bpy.data.objects.new(f"SCREEN_{tag}", me); scene.collection.objects.link(o)
    sm = emission_mat(f"screen_{tag}", (0.2158, 0.2158, 0.2158, 1), 1.0)
    me.materials.append(sm)
    return o, sm, corners
SCREENS = {}
for tag, cx, cz, w, h in [("TV_L", -3.4, 1.8, 0.9, 1.6), ("TV_C", 0, 2.0, 1.8, 1.0), ("TV_R", 3.4, 1.8, 0.9, 1.6)]:
    SCREENS[tag] = screen(tag, cx, cz, w, h)

# ---------- mesa ----------
box("DESK_TOP", (0, -0.3, 0.75), (5.4, 1.1, 0.06), M_WOOD)
box("DESK_FRONT", (0, -0.8, 0.38), (5.2, 0.08, 0.7), M_BLACK)
box("DESK_LEG_L", (-2.5, 0.0, 0.36), (0.1, 0.8, 0.72), M_BLACK)
box("DESK_LEG_R", (2.5, 0.0, 0.36), (0.1, 0.8, 0.72), M_BLACK)
box("DESK_LED", (0, -0.845, 0.72), (5.0, 0.02, 0.025), M_LED)
box("DESK_MIXER", (0, -0.35, 0.8), (0.9, 0.4, 0.05), M_METAL)

# ---------- anfitrioes (placeholders) + cadeiras + mics ----------
HOSTS = {"boomer": ("L", -1.3, 1.15, 1.18, 20), "kev": ("R", 1.3, 1.0, 1.0, -20)}  # lado, x, escala larg., escala alt., yaw graus (olhar p/ dentro)
for hid, (side, hx, sw, sh, yaw) in HOSTS.items():
    n = hid.upper(); s_in = 1 if side == "L" else -1
    root = bpy.data.objects.new(f"HOST_{side}_{n}", None); scene.collection.objects.link(root)
    root.location = (hx, 0.6, 0); root.rotation_euler = (0, 0, math.radians(yaw))
    parts = [
        sphere(f"HOST_{side}_{n}_head", (hx, 0.6, 1.30 * sh + 0.0), (0.12 * sw, 0.13 * sw, 0.15 * sh), M_GREY),
        sphere(f"HOST_{side}_{n}_torso", (hx, 0.6, 0.92 * sh), (0.25 * sw, 0.15 * sw, 0.34 * sh), M_GREY),
        sphere(f"HOST_{side}_{n}_shoulders", (hx, 0.6, 1.10 * sh), (0.33 * sw, 0.14 * sw, 0.10 * sh), M_GREY),
        sphere(f"HOST_{side}_{n}_pelvis", (hx, 0.6, 0.58), (0.24 * sw, 0.16 * sw, 0.12), M_GREY),
        tube(f"HOST_{side}_{n}_neck", (hx, 0.6, 1.14 * sh), (hx, 0.6, 1.24 * sh), 0.05 * sw, M_GREY),
    ]
    for k, sx in (("armA", -1), ("armB", 1)):
        parts.append(tube(f"HOST_{side}_{n}_{k}", (hx + sx * 0.34 * sw, 0.6, 1.08 * sh), (hx + sx * 0.30 * sw, 0.1, 0.84), 0.055 * sw, M_GREY))
    for p in parts:  # gira o corpo em torno do assento (olhar para dentro)
        p.parent = root; p.matrix_parent_inverse = root.matrix_world.inverted()
    # cadeira (nao gira com o corpo)
    box(f"CHAIR_{side}_seat", (hx, 0.6, 0.48), (0.6, 0.55, 0.08), M_CHAIR)
    box(f"CHAIR_{side}_back", (hx, 0.95, 1.0), (0.55, 0.08, 0.9), M_CHAIR)
    tube(f"CHAIR_{side}_post", (hx, 0.6, 0.0), (hx, 0.6, 0.45), 0.04, M_METAL)
    # microfone de boom (lado de dentro do host, abaixo da boca)
    base = (hx + s_in * 0.75, 0.1, 0.78); knee = (hx + s_in * 0.7, 0.05, 1.28); tip = (hx + s_in * 0.22, -0.15, 1.22)
    tube(f"MIC_{side}_stand", base, knee, 0.012, M_METAL)
    tube(f"MIC_{side}_arm", knee, tip, 0.012, M_METAL)
    tube(f"MIC_{side}_capsule", tip, (hx + s_in * 0.12, 0.0, 1.22), 0.035, M_BLACK)
    # headphones (arco simples sobre a cabeca)
    bpy.ops.mesh.primitive_torus_add(location=(hx, 0.6, 1.30 * sh + 0.01), major_radius=0.14 * sw, minor_radius=0.012, rotation=(math.radians(90), 0, math.radians(yaw)))
    assign(bpy.context.object, M_BLACK).name = f"HEADPHONES_{side}"

# ---------- luzes (mesmas p/ todas as cameras): key + fill + rim por host, ~5600K ----------
K56 = (1.0, 0.863, 0.716)
for hid, (side, hx, *_r) in HOSTS.items():
    n = side; s_in = 1 if side == "L" else -1
    tgt = (hx, 0.6, 1.1)
    area(f"KEY_{n}", (hx - s_in * 1.6, -3.0, 2.8), tgt, 110, 1.6, K56)
    area(f"FILL_{n}", (hx + s_in * 2.4, -3.2, 1.8), tgt, 45, 2.2, K56)
    area(f"RIM_{n}", (hx + s_in * 0.6, 2.2, 3.0), tgt, 70, 1.0, K56)
area("WALL_WASH", (0, -2.5, 4.6), (0, 3.1, 1.8), 45, 5.0, (1.0, 0.8, 0.6))
area("BASE_FILL", (0, -6.5, 3.0), (0, 0.5, 0.9), 40, 4.0, K56)
pl = bpy.data.lights.new("PRACTICAL_ORANGE_L", "POINT"); pl.energy = 12; pl.color = (1, 0.35, 0.05)
for nm, x in (("PRACTICAL_ORANGE_L", -4.6), ("PRACTICAL_ORANGE_R", 4.6)):
    o = bpy.data.objects.new(nm, pl); scene.collection.objects.link(o); o.location = (x, 2.4, 0.4)

# ---------- cameras ----------
SENSOR = 36.0
H_Y = 0.6  # y dos hosts
def cam(name, pos, target, focal, shift_y=0.0):
    c = bpy.data.cameras.new(name); c.lens = focal; c.sensor_width = SENSOR; c.sensor_fit = "HORIZONTAL"; c.shift_y = shift_y
    o = bpy.data.objects.new(name, c); scene.collection.objects.link(o)
    o.location = pos; o.rotation_euler = look_euler(pos, target)
    return o
Z = 1.3
# (id, aspect) -> (pos, target, focal, shift_y, frames, purpose)
CAMS = {
 "CAM_WIDE":    {"16x9": ((0, -5.8, Z), (0, 3, Z), 28, 0.0), "9x16": ((0, -4.0, Z), (0, 3, Z), 35, -0.12, "CAM_WIDE_V"), "frames": ["boomer", "kev"], "purpose": "W2 - 2-shot (hook/payoff)"},
 "CAM_MCU_L":   {"16x9": ((-1.0, H_Y - 3.0, Z), (-1.3, H_Y, Z), 50, 0.0), "9x16": ((-1.0, H_Y - 2.4, Z), (-1.3, H_Y, Z), 50, -0.1, "CAM_MCU_L_V"), "frames": ["boomer"], "purpose": "MCU-B - Boomer medio-close"},
 "CAM_CU_L":    {"16x9": ((-1.0, H_Y - 3.5, Z), (-1.3, H_Y, Z), 85, 0.0), "9x16": ((-1.0, H_Y - 2.6, Z), (-1.3, H_Y, Z), 85, -0.05, "CAM_CU_L_V"), "frames": ["boomer"], "purpose": "CU-B - Boomer close-up"},
 "CAM_MCU_R":   {"16x9": ((1.0, H_Y - 3.0, Z), (1.3, H_Y, Z), 50, 0.0), "9x16": ((1.0, H_Y - 2.4, Z), (1.3, H_Y, Z), 50, -0.1, "CAM_MCU_R_V"), "frames": ["kev"], "purpose": "MCU-K - Kev medio-close"},
 "CAM_CU_R":    {"16x9": ((1.0, H_Y - 3.5, Z), (1.3, H_Y, Z), 85, 0.0), "9x16": ((1.0, H_Y - 2.6, Z), (1.3, H_Y, Z), 85, -0.05, "CAM_CU_R_V"), "frames": ["kev"], "purpose": "CU-K - Kev close-up"},
 "CAM_TV_INSERT": {"16x9": ((0, -4.0, 2.0), (0, 3, 2.0), 85, 0.0), "9x16": ((-3.4, -1.0, 1.8), (-3.4, 3, 1.8), 85, 0.0, "CAM_TV_INSERT_V"), "frames": [], "purpose": "INS - frontal na TV_C (16:9) / TV_L sponsor (9:16)"},
 "CAM_LOW_L":   {"16x9": ((-0.8, -3.2, 0.55), (-1.3, H_Y, 1.5), 35, 0.0), "9x16": ((-0.8, -2.6, 0.55), (-1.3, H_Y, 1.5), 35, 0.0, "CAM_LOW_L_V"), "frames": ["boomer"], "purpose": "Hero low angle Boomer (so no pico de hype)"},
}
CAMOBJ = {}
for cid, d in CAMS.items():
    for asp in ("16x9", "9x16"):
        spec = d[asp]; nm = cid if asp == "16x9" else spec[4]
        CAMOBJ[(cid, asp)] = cam(nm, spec[0], spec[1], spec[2], spec[3])

# ---------- render settings ----------
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 48
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0
scene.render.dither_intensity = 0.0
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
w = bpy.data.worlds.new("world"); w.use_nodes = True; scene.world = w
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.012, 0.012, 0.012, 1); bg.inputs[1].default_value = 1.0

OUT.mkdir(parents=True, exist_ok=True); PLATES.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "studio_v1.blend"), compress=True)

# ---------- render: clean / green / mask + projecao dos cantos ----------
MESHES = [o for o in scene.objects if o.type == "MESH" and not o.name.startswith("SCREEN_")]
M_MASK_B = emission_mat("mask_black", (0, 0, 0, 1)); M_MASK_W = emission_mat("mask_white", (1, 1, 1, 1))
RES = {"16x9": (1920, 1080), "9x16": (1080, 1920)}

def set_screens(rgb):
    for tag, (o, sm, _c) in SCREENS.items():
        sm.node_tree.nodes["Emission"].inputs["Color"].default_value = (*rgb, 1)

def render(path, cam_obj, res):
    scene.camera = cam_obj; scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100; scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)

def render_mask(path, cam_obj, res):
    saved = {o: list(o.data.materials) for o in MESHES}
    bgc = bg.inputs[0].default_value[:]; bgs = bg.inputs[1].default_value
    for o in MESHES: assign(o, M_MASK_B)
    for tag, (o, sm, _c) in SCREENS.items(): o.data.materials[0] = M_MASK_W
    bg.inputs[0].default_value = (0, 0, 0, 1)
    render(path, cam_obj, res)
    for o, ms in saved.items():
        o.data.materials.clear()
        for m in ms: o.data.materials.append(m)
    for tag, (o, sm, _c) in SCREENS.items(): o.data.materials[0] = sm
    bg.inputs[0].default_value = bgc

def quad_stats(mask, W, H, px):
    """fracao do quad (dentro do quadro) ocupada por branco da mascara + pixels visiveis"""
    xs = [p[0] for p in px]; ys = [p[1] for p in px]
    x0, x1 = max(0, int(min(xs))), min(W, int(max(xs)) + 1); y0, y1 = max(0, int(min(ys))), min(H, int(max(ys)) + 1)
    if x1 <= x0 or y1 <= y0: return 0.0, 0, 0
    gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    sgn = None; inside = np.ones(gx.shape, bool)
    for i in range(4):
        (ax, ay), (bx, by) = px[i], px[(i + 1) % 4]
        cr = (bx - ax) * (gy - ay) - (by - ay) * (gx - ax)
        inside &= cr >= 0
    area_in = int(inside.sum())
    vis = int(((mask[y0:y1, x0:x1] > 0.5) & inside).sum())
    return (1 - vis / area_in) if area_in else 1.0, vis, area_in

rig = {"version": 1, "engine": "BLENDER_EEVEE", "blender": bpy.app.version_string,
       "set": {"coordinate_system": "Blender, metros, Z para cima; cameras olham +Y; camera-esquerda = -X", "sensor_width_mm": SENSOR, "sensor_fit": "HORIZONTAL",
               "lighting": "key+fill+rim por host ~5600K, mesmas luzes para todas as cameras; acentos praticos so laranja",
               "desk": {"center": [0, -0.3, 0.75], "size": [5.4, 1.1, 0.06]},
               "screens_world": {t: [list(map(lambda v: round(v, 4), c)) for c in SCREENS[t][2]] for t in SCREENS}},
       "hosts": [{"id": "boomer", "side": "L", "object": "HOST_L_BOOMER", "x": -1.3}, {"id": "kev", "side": "R", "object": "HOST_R_KEV", "x": 1.3}],
       "cameras": [], "screens": [{"id": t, "per_camera": {}} for t in SCREENS]}
t0 = time.time(); nplates = 0
for (cid, asp), co in CAMOBJ.items():
    W, H = RES[asp]; key = f"{cid}_{asp}"; spec = CAMS[cid][asp]
    files = {v: f"plates/{cid}_{asp}_{v}.png" for v in ("clean", "green", "mask")}
    d = (Vector(spec[1]) - Vector(spec[0])).normalized()
    rig["cameras"].append({"id": cid, "object": co.name, "aspect": asp.replace("x", ":"), "resolution": [W, H], "focal_mm": spec[2],
        "sensor": {"width_mm": SENSOR, "fit": "HORIZONTAL"}, "shift_y": spec[3],
        "position": [round(v, 4) for v in co.location], "rotation": {"euler_xyz_deg": [round(math.degrees(a), 3) for a in co.rotation_euler]},
        "frames": CAMS[cid]["frames"], "lookDir": [round(v, 4) for v in d], "purpose": CAMS[cid]["purpose"], "plates": files})
    if RENDER:
        for v, rgb in (("clean", (0.2158,) * 3), ("green", (0.0, 1.0, 0.0))):
            set_screens(rgb); render(OUT / files[v], co, (W, H)); nplates += 1
        set_screens((0.2158,) * 3)
        render_mask(OUT / files["mask"], co, (W, H)); nplates += 1
        img = bpy.data.images.load(str(OUT / files["mask"])); arr = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(arr)
        mask = arr.reshape(H, W, 4)[::-1, :, 0]; bpy.data.images.remove(img)
    for s in rig["screens"]:
        corners = SCREENS[s["id"]][2]; px = []
        for c in corners:
            u = world_to_camera_view(scene, co, Vector(c)); px.append([round(u.x * W, 2), round((1 - u.y) * H, 2)])
        entry = {"corners_px": px, "visible": False, "occluded_fraction": 1.0}
        if RENDER:
            occ, vis, ain = quad_stats(mask, W, H, px)
            entry.update({"visible": vis >= 200, "occluded_fraction": round(occ, 4), "visible_pixels": vis, "in_frame_pixels": ain})
        s["per_camera"][key] = entry
(OUT / "rig.json").write_text(json.dumps(rig, indent=1))
print(f"RIG_DONE plates={nplates} render_seconds={time.time() - t0:.1f}")
