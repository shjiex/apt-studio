"""Make the tile pictures of the catalog pieces that are built from simple shapes.

Those pieces have no Blender model, so their picture is taken from the app's own
3D shapes: pipeline/tiles.html draws one piece, and this script saves it.

    npm run dev -- --port 5199        (in one terminal)
    python3 pipeline/render_tiles.py  (in another)

It writes public/furniture/<type>.png, 320 by 320 with a see-through background,
for every catalog entry that has no `model`.
"""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = sys.argv[1] if len(sys.argv) > 1 else "5199"
CHROME = sys.argv[2] if len(sys.argv) > 2 else None  # path to Chrome, if Playwright's own is not installed

# The entries without a model file are the ones built from shapes.
catalog = (ROOT / "src/data/catalog.js").read_text()
types = [m.group(1) for m in re.finditer(r"\{ type: '(\w+)',[^\n]*\},", catalog) if "model:" not in m.group(0)]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    page = browser.new_page(viewport={"width": 320, "height": 320})
    for kind in types:
        page.goto(f"http://localhost:{PORT}/pipeline/tiles.html?type={kind}")
        page.wait_for_function("window.tileReady === true")
        page.wait_for_timeout(700)  # a moment for the first frames to be drawn
        page.locator("canvas").screenshot(path=str(ROOT / "public/furniture" / f"{kind}.png"), omit_background=True)
        print("saved", kind)
    browser.close()
