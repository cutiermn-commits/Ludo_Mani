"""Simulate the phone: apply EXIF orientation (Glide / the browser do), resize to the cut-out width."""
import json, sys, os
from PIL import Image, ImageOps
src, dst, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
os.makedirs(dst, exist_ok=True)
truth = json.load(open(f'{src}/truth.json'))
for n in truth:
    im = ImageOps.exif_transpose(Image.open(f'{src}/{n}.jpg')).convert('RGBA')
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.BILINEAR)
    open(f'{dst}/{n}.rgba', 'wb').write(im.tobytes())
    json.dump({'w': width, 'h': h}, open(f'{dst}/{n}.json', 'w'))
print('prepped', len(truth))
