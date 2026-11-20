import sys
from PIL import Image, ImageDraw
L = sys.argv[1]; out = sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 10
tiles = []
for i in range(n):
    for m in ('avatar', 'photo'):
        im = Image.open(f'{L}/shots/outfit{i}-{m}.png').convert('RGB'); im.thumbnail((230, 330))
        t = Image.new('RGB', (236, 350), 'white'); t.paste(im, (3, 3)); ImageDraw.Draw(t).text((5, 336), f'{i} {m}', fill='black'); tiles.append(t)
cols = 6
rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * 236, rows * 350), 'white')
for k, t in enumerate(tiles): s.paste(t, ((k % cols) * 236, (k // cols) * 350))
s.save(out)
