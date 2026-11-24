#!/usr/bin/env python3
"""Compoe o criativo de patrocinador nas telas de um plate (ffmpeg perspective + mascara).
Uso: python3 tools/rig/composite_sponsor.py            # todos os plates clean com tela visivel
     python3 tools/rig/composite_sponsor.py CAM_WIDE_16x9
Cantos vem de design/rig-v1/rig.json; so pinta onde a mascara e branca (respeita oclusao).
"""
import json, subprocess, sys
from pathlib import Path
RIG = Path(__file__).resolve().parents[2] / "design" / "rig-v1"
rig = json.loads((RIG / "rig.json").read_text())
SP = {"TV_C": RIG / "sponsor_placeholder_16x9.png", "TV_L": RIG / "sponsor_placeholder.png", "TV_R": RIG / "sponsor_placeholder.png"}
(RIG / "composite").mkdir(exist_ok=True)

def run(cam):
    key = f"{cam['id']}_{cam['aspect'].replace(':', 'x')}"
    W, H = cam["resolution"]
    scr = [s for s in rig["screens"] if s["per_camera"][key]["visible"]]
    if not scr: return None
    inputs = ["-i", str(RIG / cam["plates"]["clean"]), "-i", str(RIG / cam["plates"]["mask"])]
    for s in scr: inputs += ["-i", str(SP[s["id"]])]
    f = [f"[0:v]format=gbrp[b0]", f"[1:v]format=gbrp,split={len(scr)}" + "".join(f"[m{i}]" for i in range(len(scr)))]
    for i, s in enumerate(scr):
        c = s["per_camera"][key]["corners_px"]  # bordas pretas de 2px evitam que o clamp de borda do ffmpeg vaze fora do quad; TL,TR,BR,BL -> perspective quer TL,TR,BL,BR
        p = f"x0={c[0][0]}:y0={c[0][1]}:x1={c[1][0]}:y1={c[1][1]}:x2={c[3][0]}:y2={c[3][1]}:x3={c[2][0]}:y3={c[2][1]}:sense=destination:interpolation=linear"
        f.append(f"[{i+2}:v]scale={W-4}:{H-4},pad={W}:{H}:2:2:black,format=gbrp,perspective={p}[w{i}]")
        f.append(f"color=c=white:s={W-4}x{H-4},pad={W}:{H}:2:2:black,format=gbrp,perspective={p}[q{i}]")
        f.append(f"[m{i}][q{i}]blend=all_mode=multiply[k{i}]")
        f.append(f"[b{i}][w{i}][k{i}]maskedmerge[b{i+1}]")
    out = RIG / "composite" / f"{key}_sponsor.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(f), "-map", f"[b{len(scr)}]", "-frames:v", "1", "-pix_fmt", "rgb24", str(out)], check=True)
    return out

n = 0
for cam in rig["cameras"]:
    if len(sys.argv) > 1 and f"{cam['id']}_{cam['aspect'].replace(':', 'x')}" != sys.argv[1]: continue
    if run(cam): n += 1
print(f"composites: {n}")
