#!/usr/bin/env python3
"""Bundle src/, avatars/ and assets/ (fonts, scenes) into one self-contained page: dist/index.html and dist/artifact.html."""
import base64, io, pathlib
ROOT = pathlib.Path(__file__).parent
SRC, DIST, AVA = ROOT / "src", ROOT / "dist", ROOT / "avatars"
DIST.mkdir(exist_ok=True)

import mimetypes
def data_uri(path, mime):
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

FONTS = [("Kalam", 400, "kalam-latin-400-normal.woff2"), ("Kalam", 700, "kalam-latin-700-normal.woff2"),
         ("Permanent Marker", 400, "permanent-marker-latin-400-normal.woff2"), ("Rubik Wet Paint", 400, "rubik-wet-paint-latin-400-normal.woff2")]
FONTCSS = "".join(f"@font-face{{font-family:'{n}';font-weight:{w};font-display:swap;src:url({data_uri(ROOT/'assets'/'fonts'/f,'font/woff2')}) format('woff2')}}\n" for n, w, f in FONTS)

avatars = ",".join(f"'{p.stem}':'{data_uri(p,'image/webp')}'" for p in sorted(AVA.glob("*.webp")))
js = f"const AVATARS={{{avatars}}};\n" + "\n".join((SRC / f).read_text() for f in ("euchre.js", "ui.js", "game.js")) + "\nrenderHome();\n"
css = FONTCSS + (SRC / "styles.css").read_text()
css = css.replace("SCENE_HUB", f"url({data_uri(ROOT/'assets'/'scenes'/'hub.webp','image/webp')})").replace("SCENE_TABLE", f"url({data_uri(ROOT/'assets'/'scenes'/'table_pizza.webp','image/webp')})")
body = (SRC / "body.html").read_text()

(DIST / "artifact.html").write_text(f"<title>Trash Night Euchre</title>\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n")
(DIST / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Euchre">
<meta name="theme-color" content="#141720">
<title>Trash Night Euchre</title>
<style>
:root{{padding-top:env(safe-area-inset-top,0px)}}
{css}
</style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
""")
print("built", {p.name: p.stat().st_size for p in DIST.iterdir()})
