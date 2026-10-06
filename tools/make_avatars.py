#!/usr/bin/env python3
"""Square up the painted raccoon heads from trash-night-euchre into small webp profile pictures."""
import pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
CREW = ROOT.parent / "trash-night-euchre" / "assets" / "crew"
OUT = ROOT / "avatars"; OUT.mkdir(exist_ok=True)
IDS = ['you', 'bandit', 'slick', 'tiny', 'duchess', 'gus', 'professor']
MOODS = ['neutral', 'laugh', 'scowl', 'shock', 'wink', 'meh']
SIZE = 128
for i in IDS:
    for m in MOODS:
        im = Image.open(CREW / i / f'head_{m}.webp').convert('RGBA'); w, h = im.size; s = max(w, h)
        c = Image.new('RGBA', (s, s), (0, 0, 0, 0)); c.alpha_composite(im, ((s - w) // 2, (s - h) // 2))
        c.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f'{i}_{m}.webp', quality=80)
print('avatars ->', OUT)
