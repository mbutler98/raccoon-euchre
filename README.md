# Raccoon Euchre

*(Trash Night Euchre, table edition)*

Euchre against the raccoon crew. The menu is the alley crew scene; the game is played on a cardboard table in the empty alley, with taped-paper UI, handwritten type and papery cards.

**Play:** https://mbutler98.github.io/raccoon-euchre/ (once GitHub Pages is on), or open `index.html` locally (one self-contained file, fonts and art embedded, works offline).

## What's in it
- Three tables: Back Porch (easy), Behind the Pizza Place (medium), The Laundromat (hard).
- Full euchre: order up / pick up and discard, round two calling, going alone, stick the dealer (toggle), first to 10.
- Profile polaroids that react: wink when they call, laugh when they take a trick, shock when euchred. Tricks are chalk tally marks.
- Coach hints (toggle): a star on the recommended button or card plus a one-line reason.
- Unlockables in **My deck**: 8 card backs and 4 card faces, each with a goal and a progress bar.

| Card back | Unlock |
|---|---|
| Classic Red | always |
| Tony's Pizza | win a game |
| Night Alley | win Behind the Pizza Place |
| Recycling Bin | euchre the other team 5 times |
| Bandit Mask | win 3 in a row |
| Grime Lords | win at The Laundromat |
| Trash King | sweep a hand going alone |
| Lucky Ace | take 100 tricks yourself |

| Card face | Unlock |
|---|---|
| Fresh Paper | always |
| Notebook | play 5 games |
| Newsprint | play 25 hands |
| Pizza Grease | win 5 games |

## Look
- Fonts (embedded from `assets/fonts`): **Kalam** for the orange marker text, **Rubik Wet Paint** for the teal drip headings, **Permanent Marker** for labels and numbers.
- Scenes (`assets/scenes`, copied from trash-night-euchre): `hub.webp` is the menu, `table_pizza.webp` sits behind the game.

## Develop
- `src/euchre.js` rules engine + bot brains (unchanged from trash-night-euchre)
- `src/ui.js` save data, sound, scenes, paper cards
- `src/game.js` menu, tables, deck, match flow, input, coach, unlocks
- `src/styles.css` everything visual, including each card back and face
- `avatars/` profile pictures, made by `python3 tools/make_avatars.py` from `../trash-night-euchre/assets/crew`

`python3 build.py` bundles everything into `dist/index.html` (and `dist/artifact.html`, which is git-ignored). The copy at the repo root, `index.html`, is what GitHub Pages serves: after a rebuild, run `cp dist/index.html index.html`.
