"""Realistic-ish flat-lay clothing photos for testing (synthetic: no real photos are reachable here).
Each garment is drawn upright in cm, with fabric texture, wrinkles, seams and a soft shadow, on a
real-looking floor/bed, then turned/moved like a phone photo. Ground-truth anchor points
(shoulder seams, waistband corners) are written to truth.json for measuring placement error."""
import json, math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
R = random.Random(7)
PX = 9  # pixels per cm before the photo transform

def lowfreq(w, h, cells, seed, amp):
    rs = np.random.RandomState(seed)
    small = Image.fromarray((rs.rand(cells, cells) * 255).astype(np.uint8))
    big = np.asarray(small.resize((w, h), Image.BICUBIC)).astype(np.float32) / 255 - 0.5
    return big * 2 * amp

def finen(w, h, seed, amp):
    return np.random.RandomState(seed).randn(h, w).astype(np.float32) * amp

# ---------- garment shapes (upright, cm, origin = top centre) ----------
def sleeve(S, A, ang_deg, length, side):
    a = math.radians(ang_deg)
    d = (side * math.cos(a), math.sin(a))
    return [S, (S[0] + d[0] * length, S[1] + d[1] * length), (A[0] + d[0] * length * 0.92, A[1] + d[1] * length * 0.92), A]

def top_shape(bw, L, sl, ang, armh=21, neck=9, hood=False, flare=0, slope=4):
    """bw = half body width. Returns polygons (list), anchors."""
    S_R = (bw + 1.5, slope); S_L = (-bw - 1.5, slope)
    A_R = (bw, slope + armh); A_L = (-bw, slope + armh)
    scoop = [(-neck * math.cos(t), 6.5 * math.sin(t) ** 1.3) for t in [i * math.pi / 8 for i in range(1, 8)]]
    body = [(-neck, 0)] + scoop + [(neck, 0), S_R, A_R, (bw + flare, L), (-bw - flare, L), A_L, S_L]
    polys = [body]
    if sl > 0:
        polys.append(sleeve(S_R, A_R, ang, sl, 1))
        polys.append(sleeve(S_L, A_L, ang, sl, -1))
    if hood:
        polys.append([(-neck - 2, 2), (-neck - 4, -16), (-6, -27), (6, -27), (neck + 4, -16), (neck + 2, 2)])
    return polys, {'shoulderL': S_L, 'shoulderR': S_R, 'hem': (0, L)}

def dress_shape(bw, waist, L, hem, sl=12, ang=55, strap=False):
    S_R = (bw + 1, 3); S_L = (-bw - 1, 3)
    body = [(-8, 0), (8, 0), S_R, (bw, 20), (bw - 3, waist), (hem, L), (-hem, L), (-bw + 3, waist), (-bw, 20), S_L]
    polys = [body]
    if strap:
        polys = [[(-bw + 2, 8), (bw - 2, 8), (bw, 20), (bw - 3, waist), (hem, L), (-hem, L), (-bw + 3, waist), (-bw, 20)],
                 [(-bw + 2, 0), (-bw + 5, 0), (-bw + 5, 9), (-bw + 2, 9)], [(bw - 5, 0), (bw - 2, 0), (bw - 2, 9), (bw - 5, 9)]]
        S_R = (bw - 3.5, 0); S_L = (-bw + 3.5, 0)
    elif sl > 0:
        polys.append(sleeve(S_R, (bw, 19), ang, sl, 1))
        polys.append(sleeve(S_L, (-bw, 19), ang, sl, -1))
    return polys, {'shoulderL': S_L, 'shoulderR': S_R, 'hem': (0, L)}

def pants_shape(ww, L, rise, hemw, splay=3, gap=1.5):
    # ww = half waist width; legs from crotch; splay = extra outward shift at the hem (cm)
    poly = [(-ww, 0), (ww, 0), (ww + 2, rise * 0.8), (ww + 2 + splay, L), (ww + 2 + splay - hemw, L), (gap / 2, rise),
            (-gap / 2, rise), (-ww - 2 - splay + hemw, L), (-ww - 2 - splay, L), (-ww - 2, rise * 0.8)]
    return [poly], {'waistL': (-ww, 0), 'waistR': (ww, 0), 'hem': (0, L)}

def skirt_shape(ww, L, hem):
    return [[(-ww, 0), (ww, 0), (hem, L), (-hem, L)]], {'waistL': (-ww, 0), 'waistR': (ww, 0), 'hem': (0, L)}

def shoes_shape():
    polys = []
    for cx in (-9, 9):
        polys.append([(cx - 4.5, 0), (cx + 4.5, 0), (cx + 5, 8), (cx + 5, 22), (cx + 4, 26), (cx - 4, 26), (cx - 5, 22), (cx - 5, 8)])
    return polys, {}

# ---------- fabrics ----------
def fabric(w, h, base, seed, kind):
    base = np.array(base, np.float32)
    shade = 1 + lowfreq(w, h, 9, seed, 0.13) + lowfreq(w, h, 30, seed + 1, 0.05)
    img = base[None, None, :] * shade[..., None]
    img += finen(w, h, seed + 2, 4 if kind != 'denim' else 9)[..., None]
    if kind == 'stripes':
        yy = np.arange(h)[:, None]
        mask = ((yy // 28) % 2 == 0).astype(np.float32)
        img = img * (1 - 0.55 * mask[..., None]) + np.array([245, 245, 240], np.float32) * 0.55 * mask[..., None]
    if kind == 'denim':
        xx = np.arange(w)[None, :]; yy = np.arange(h)[:, None]
        img += (((xx + yy) % 5 == 0) * 12)[..., None]
    if kind == 'check':
        xx = np.arange(w)[None, :]; yy = np.arange(h)[:, None]
        m = (((xx // 40) + (yy // 40)) % 2).astype(np.float32)
        img *= (1 - 0.25 * m)[..., None]
    return np.clip(img, 0, 255)

# ---------- backgrounds ----------
def background(w, h, kind, seed):
    if kind == 'wood':
        img = np.zeros((h, w, 3), np.float32)
        plank = 130
        rs = np.random.RandomState(seed)
        for i in range(0, w, plank):
            tone = rs.uniform(-14, 14)
            img[:, i:i + plank] = np.array([196, 160, 118]) + tone
        xx = np.arange(w)[None, :]; yy = np.arange(h)[:, None]
        grain = np.sin(xx * 0.35 + 6 * np.sin(yy * 0.01 + xx * 0.02)) * 6
        img += grain[..., None] + finen(w, h, seed, 4)[..., None]
        for i in range(0, w, plank):
            img[:, i:i + 2] *= 0.75
    elif kind == 'carpet':
        img = np.array([170, 165, 155], np.float32)[None, None] + finen(w, h, seed, 11)[..., None] + lowfreq(w, h, 6, seed, 10)[..., None]
    elif kind == 'sheet':
        yy = np.arange(h)[:, None]; xx = np.arange(w)[None, :]
        folds = np.sin(xx * 0.012 + yy * 0.004) * 9 + np.sin(yy * 0.02 - xx * 0.003) * 6
        img = np.array([238, 236, 232], np.float32)[None, None] + (folds + lowfreq(w, h, 5, seed, 8) + finen(w, h, seed, 2.5))[..., None]
    elif kind == 'tiles':
        img = np.array([205, 205, 200], np.float32)[None, None] + finen(w, h, seed, 4)[..., None] + np.zeros((h, w, 1), np.float32)
        t = 260
        for i in range(0, w, t): img[:, i:i + 5] = np.array([150, 148, 140])
        for j in range(0, h, t): img[j:j + 5, :] = np.array([150, 148, 140])
    elif kind == 'darkfloor':
        img = np.array([70, 60, 55], np.float32)[None, None] + finen(w, h, seed, 6)[..., None] + lowfreq(w, h, 7, seed, 8)[..., None]
    elif kind == 'rug':  # busy pattern: the app should say it can't cut this one out
        xx = np.arange(w)[None, :]; yy = np.arange(h)[:, None]
        img = np.stack([128 + 90 * np.sin(xx * 0.05) * np.cos(yy * 0.04), 120 + 80 * np.sin((xx + yy) * 0.03), 140 + 70 * np.cos(xx * 0.02 - yy * 0.06)], -1).astype(np.float32)
    # light falloff across the room
    yy, xx = np.mgrid[0:h, 0:w]
    light = 1 - 0.18 * ((xx / w - 0.3) ** 2 + (yy / h - 0.2) ** 2)
    return np.clip(img * light[..., None], 0, 255)

# ---------- one photo ----------
def render(name, polys, anchors, color, kind, bg, rot=0, scale=1.0, shift=(0, 0), photo=(1200, 1600), seed=1, seams=(), tilt=0, exif=None):
    xs = [p[0] for poly in polys for p in poly]; ys = [p[1] for poly in polys for p in poly]
    minx, maxx, miny, maxy = min(xs) - 3, max(xs) + 3, min(ys) - 3, max(ys) + 3
    gw, gh = int((maxx - minx) * PX), int((maxy - miny) * PX)
    to = lambda p: ((p[0] - minx) * PX, (p[1] - miny) * PX)
    m = Image.new('L', (gw * 2, gh * 2), 0)
    d = ImageDraw.Draw(m)
    for poly in polys:
        d.polygon([(x * 2, y * 2) for x, y in map(to, poly)], fill=255)
    m = m.resize((gw, gh), Image.LANCZOS)
    tex = fabric(gw, gh, color, seed, kind)
    g = Image.fromarray(tex.astype(np.uint8))
    gd = ImageDraw.Draw(g)
    for (a, b, wdt) in seams:
        gd.line([to(a), to(b)], fill=tuple(int(c * 0.72) for c in color), width=wdt)
    # outline shading at the edges (fabric thickness)
    edge = np.asarray(m.filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255
    garr = np.asarray(g).astype(np.float32) * (0.82 + 0.18 * edge[..., None])
    g = Image.fromarray(np.clip(garr, 0, 255).astype(np.uint8))
    # photo transform: rotate the garment
    angle = rot + tilt
    g = g.rotate(angle, resample=Image.BICUBIC, expand=True)
    m = m.rotate(angle, resample=Image.BICUBIC, expand=True)
    pw, ph = photo
    target = min(pw, ph) * 0.62 * scale / max(g.width, g.height) * max(g.width, g.height) / max(gw, gh)
    k = min(pw * 0.8 * scale / g.width, ph * 0.8 * scale / g.height)
    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    m = m.resize(g.size, Image.LANCZOS)
    ox = int((pw - g.width) / 2 + shift[0] * pw); oy = int((ph - g.height) / 2 + shift[1] * ph)
    bgimg = background(pw, ph, bg, seed)
    # soft shadow
    sh = Image.new('L', (pw, ph), 0); sh.paste(m, (ox + 10, oy + 14))
    sh = np.asarray(sh.filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255
    bgimg *= (1 - 0.28 * sh)[..., None]
    canvas = Image.fromarray(np.clip(bgimg, 0, 255).astype(np.uint8))
    canvas.paste(g, (ox, oy), m)
    arr = np.asarray(canvas).astype(np.float32) + np.random.RandomState(seed + 9).randn(ph, pw, 1) * 3
    canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    # anchors → photo coordinates
    cx0, cy0 = gw / 2, gh / 2
    def fwd(p):
        x, y = to(p)
        a = math.radians(-angle)  # PIL rotates counter-clockwise for positive angles
        dx, dy = x - cx0, y - cy0
        rx, ry = dx * math.cos(a) - dy * math.sin(a), dx * math.sin(a) + dy * math.cos(a)
        return ((rx * k + g.width / 2 + ox) / pw, (ry * k + g.height / 2 + oy) / ph)
    truth = {k2: fwd(v) for k2, v in anchors.items()}
    info = {'rot': rot, 'tilt': tilt, 'bg': bg, 'anchors': truth}
    if exif:  # store the pixels sideways with an EXIF orientation tag, like a phone camera
        ex = Image.Exif(); ex[0x0112] = exif
        stored = canvas.transpose({6: Image.ROTATE_90, 8: Image.ROTATE_270, 3: Image.ROTATE_180}[exif])
        stored.save(f'{OUT}/{name}.jpg', quality=85, exif=ex)
    else:
        canvas.save(f'{OUT}/{name}.jpg', quality=85)
    return info

G = {}
def add(name, shape, color, kind, cat, sub, seams=()):
    G[name] = (shape, color, kind, cat, sub, seams)

add('tshirt', top_shape(23, 64, 19, 32), (214, 52, 64), 'plain', 'top', 'tshirt', [((-9, 0), (9, 0), 3)])
add('tshirt-stripes', top_shape(22, 60, 17, 38), (40, 60, 120), 'stripes', 'top', 'tshirt')
add('top-sleeveless', top_shape(19, 52, 0, 0, armh=18, neck=8), (240, 170, 200), 'plain', 'top', 'top')
add('shirt-long', top_shape(24, 72, 58, 62, neck=7), (230, 236, 246), 'check', 'top', 'shirt', [((0, 2), (0, 72), 2)])
add('shirt-armsout', top_shape(24, 70, 60, 8, neck=7), (120, 170, 220), 'plain', 'top', 'shirt', [((0, 2), (0, 70), 2)])
add('hoodie', top_shape(27, 66, 60, 70, hood=True, neck=8), (120, 124, 132), 'plain', 'top', 'hoodie', [((-14, 44), (14, 44), 3), ((-26, 62), (26, 62), 4)])
add('sweater', top_shape(26, 62, 56, 55, neck=8), (60, 140, 90), 'plain', 'top', 'sweater', [((-26, 58), (26, 58), 5)])
add('jacket', top_shape(28, 70, 62, 66, neck=8), (40, 50, 70), 'plain', 'outerwear', 'jacket', [((0, 1), (0, 70), 3)])
add('dress-frock', dress_shape(19, 36, 92, 44, sl=12, ang=50), (250, 200, 70), 'plain', 'dress', 'dress')
add('dress-strap', dress_shape(17, 34, 86, 34, strap=True), (150, 90, 200), 'stripes', 'dress', 'dress')
add('jeans', pants_shape(19, 100, 28, 17, splay=3), (60, 90, 150), 'denim', 'bottom', 'jeans', [((-19, 4), (19, 4), 3)])
add('trousers', pants_shape(20, 102, 29, 19, splay=1), (40, 40, 44), 'plain', 'bottom', 'trousers', [((-20, 4), (20, 4), 3)])
add('leggings', pants_shape(16, 92, 26, 11, splay=6), (25, 25, 30), 'plain', 'bottom', 'leggings')
add('shorts', pants_shape(21, 36, 26, 22, splay=2), (200, 190, 150), 'plain', 'bottom', 'shorts', [((-21, 4), (21, 4), 3)])
add('skirt', skirt_shape(17, 48, 30), (230, 120, 150), 'plain', 'bottom', 'skirt')
add('sneakers', shoes_shape(), (245, 245, 245), 'plain', 'shoes', 'sneakers')

if __name__ == '__main__':
    truth = {}
    bgs = ['wood', 'carpet', 'sheet', 'tiles', 'darkfloor']
    i = 0
    for name, (shape, color, kind, cat, sub, seams) in G.items():
        polys, anchors = shape
        # a normal photo: upright, small tilt, different floor each time
        variants = [('up', 0, R.uniform(-7, 7), None), ('side', 90, R.uniform(-5, 5), None), ('upside', 180, 0, None), ('exif', 0, 3, 6)]
        for v, rot, tilt, exif in variants:
            i += 1
            bg = bgs[i % len(bgs)]
            n = f'{name}--{v}'
            info = render(n, polys, anchors, color, kind, bg, rot=rot, tilt=tilt, seed=i, seams=seams, shift=(R.uniform(-0.06, 0.06), R.uniform(-0.05, 0.05)), exif=exif)
            info.update(cat=cat, sub=sub, name=name, variant=v)
            truth[n] = info
    # a busy rug: should be refused, not cut out badly
    polys, anchors = G['tshirt'][0]
    truth['tshirt--rug'] = dict(render('tshirt--rug', polys, anchors, (214, 52, 64), 'plain', 'rug', seed=99), cat='top', sub='tshirt', name='tshirt', variant='rug')
    json.dump(truth, open(f'{OUT}/truth.json', 'w'), indent=1)
    print(len(truth), 'photos')
