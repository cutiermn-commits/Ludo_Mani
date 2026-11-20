"""Imaginary test people (synthetic, not real persons): a girl standing in a room, full body,
front view, arms a little away from the body. Several looks, plus one stored sideways with an
EXIF orientation tag like a phone camera does."""
import math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
OUT = sys.argv[1]

def room(w, h, wall, floor, seed):
    yy, xx = np.mgrid[0:h, 0:w]
    img = np.zeros((h, w, 3), np.float32)
    horizon = int(h * 0.78)
    img[:horizon] = np.array(wall)
    img[horizon:] = np.array(floor)
    light = 1 - 0.22 * (((xx - w * 0.3) / w) ** 2 + ((yy - h * 0.2) / h) ** 2)
    img *= light[..., None]
    img += np.random.RandomState(seed).randn(h, w, 1) * 3
    return img

def limb(d, a, b, w0, w1, fill):
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); nx, ny = -math.sin(ang), math.cos(ang)
    d.polygon([(a[0] + nx * w0, a[1] + ny * w0), (b[0] + nx * w1, b[1] + ny * w1), (b[0] - nx * w1, b[1] - ny * w1), (a[0] - nx * w0, a[1] - ny * w0)], fill=fill)
    d.ellipse([a[0] - w0, a[1] - w0, a[0] + w0, a[1] + w0], fill=fill); d.ellipse([b[0] - w1, b[1] - w1, b[0] + w1, b[1] + w1], fill=fill)

def person(name, skin, hair, tee, legs, arm_deg=78, scale=1.0, shift=0, seed=1, exif=None, w=900, h=1200):
    img = Image.fromarray(np.clip(room(w, h, (214, 210, 202), (150, 120, 95), seed), 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    s = scale * h / 1200
    cx = w / 2 + shift * w
    top = h * 0.08
    P = lambda x, y: (cx + x * s, top + y * s)
    # body proportions (girl ~ 7 heads)
    head_r = 62
    sh_y, hip_y, knee_y, ank_y = 205, 470, 700, 935
    sh_x, hip_x = 105, 62
    # shadow on the floor
    d.ellipse([P(-130, ank_y + 20)[0], P(0, ank_y + 5)[1], P(130, 0)[0], P(0, ank_y + 45)[1]], fill=(110, 88, 70))
    # legs (leggings)
    for side in (-1, 1):
        limb(d, P(side * 48, hip_y - 10), P(side * 40, knee_y), 40 * s, 30 * s, legs)
        limb(d, P(side * 40, knee_y), P(side * 38, ank_y), 30 * s, 20 * s, legs)
        d.ellipse([P(side * 38 - 30, ank_y - 12)[0], P(0, ank_y - 12)[1], P(side * 38 + 30, 0)[0], P(0, ank_y + 26)[1]], fill=(40, 40, 46))  # shoes
    # arms (skin, with short tee sleeves)
    a = math.radians(arm_deg)
    for side in (-1, 1):
        S = P(side * (sh_x - 14), sh_y + 18)
        E = (S[0] + side * math.cos(a) * 160 * s, S[1] + math.sin(a) * 160 * s)
        Wr = (E[0] + side * math.cos(a) * 0.4 * 150 * s, E[1] + math.sin(a) * 150 * s)
        limb(d, S, E, 24 * s, 20 * s, skin)
        limb(d, E, Wr, 20 * s, 15 * s, skin)
        d.ellipse([Wr[0] - 20 * s, Wr[1] - 10 * s, Wr[0] + 20 * s, Wr[1] + 34 * s], fill=skin)  # hand
        limb(d, S, (S[0] + side * math.cos(a) * 70 * s, S[1] + math.sin(a) * 70 * s), 34 * s, 30 * s, tee)  # sleeve
    # torso (tee)
    d.polygon([P(-sh_x, sh_y), P(sh_x, sh_y), P(sh_x - 12, sh_y + 120), P(hip_x + 25, hip_y), P(-hip_x - 25, hip_y), P(-sh_x + 12, sh_y + 120)], fill=tee)
    d.ellipse([P(-sh_x, sh_y - 22)[0], P(0, sh_y - 22)[1], P(sh_x, 0)[0], P(0, sh_y + 40)[1]], fill=tee)
    # neck + head + hair
    d.rectangle([P(-24, 120)[0], P(0, 120)[1], P(24, 0)[0], P(0, sh_y)[1]], fill=skin)
    d.ellipse([P(-head_r - 8, 2)[0], P(0, 2)[1], P(head_r + 8, 0)[0], P(0, 140)[1]], fill=hair)
    d.ellipse([P(-head_r + 6, 12)[0], P(0, 12)[1], P(head_r - 6, 0)[0], P(0, 150)[1]], fill=skin)
    d.chord([P(-head_r - 4, 0)[0], P(0, 0)[1], P(head_r + 4, 0)[0], P(0, 90)[1]], 180, 360, fill=hair)
    for side in (-1, 1):
        d.ellipse([P(side * 24 - 7, 72)[0], P(0, 72)[1], P(side * 24 + 7, 0)[0], P(0, 84)[1]], fill=(50, 35, 30))
    d.arc([P(-18, 98)[0], P(0, 98)[1], P(18, 0)[0], P(0, 118)[1]], 20, 160, fill=(170, 80, 90), width=max(2, int(4 * s)))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    if exif:
        ex = Image.Exif(); ex[0x0112] = exif
        img.transpose(Image.ROTATE_90).save(f'{OUT}/{name}.jpg', quality=88, exif=ex)
    else:
        img.save(f'{OUT}/{name}.jpg', quality=88)

person('girl-a', (232, 190, 160), (60, 40, 28), (200, 200, 205), (40, 40, 52), arm_deg=78, seed=1)
person('girl-b', (150, 102, 72), (25, 18, 14), (230, 160, 190), (60, 70, 110), arm_deg=66, scale=0.92, shift=0.04, seed=2)
person('girl-c-exif', (210, 165, 130), (150, 90, 40), (120, 170, 140), (50, 50, 60), arm_deg=82, seed=3, exif=6)
print('ok')
