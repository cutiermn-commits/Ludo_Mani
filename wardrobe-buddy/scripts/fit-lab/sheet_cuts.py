import json, sys, glob, os
from PIL import Image
L = sys.argv[1]; names = sys.argv[2].split(',') if len(sys.argv) > 2 else None
files = sorted(glob.glob(f'{L}/cut/*.cut.json'))
if names: files = [f'{L}/cut/{n}.cut.json' for n in names]
tiles = []
for f in files:
    m = json.load(open(f)); n = os.path.basename(f)[:-9]
    im = Image.frombytes('RGBA', (m['w'], m['h']), open(f[:-5] + '.rgba', 'rb').read())
    bg = Image.new('RGBA', im.size, (255, 0, 255, 255))
    for y in range(0, im.height, 10):
        for x in range(0, im.width, 10):
            if (x // 10 + y // 10) % 2: bg.paste((0, 200, 0, 255), (x, y, x + 10, y + 10))
    bg.alpha_composite(im)
    bg.thumbnail((150, 150)); t = Image.new('RGB', (160, 170), 'white'); t.paste(bg.convert('RGB'), (5, 5))
    from PIL import ImageDraw
    ImageDraw.Draw(t).text((3, 157), n[:26], fill='black'); tiles.append(t)
cols = 8; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 160, rows * 170), 'white')
for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * 160, (i // cols) * 170))
sheet.save(f'{L}/out/cuts.png'); print(len(tiles))
