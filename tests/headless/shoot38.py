# Glass and WCAG AA: put the worst backdrops behind the glass controls, read the colour the
# browser really paints, and work out the contrast of the text that sits on it.
import asyncio, json, io
from playwright.async_api import async_playwright
from PIL import Image
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
def lum(rgb):
    def lin(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
def contrast(a, b):
    la, lb = lum(a), lum(b)
    return round((max(la, lb) + 0.05) / (min(la, lb) + 0.05), 2)
INK, WHITE = (15, 15, 14), (255, 255, 255)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={'worst': {}}
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'glass-plan.png')
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'glass-inside.png')
        r['filter'] = await pg.evaluate("getComputedStyle(document.querySelector('.stage__history')).backdropFilter")
        async def pixel(x, y):
            png = await pg.screenshot(clip={'x': x - 2, 'y': y - 2, 'width': 4, 'height': 4})
            return Image.open(io.BytesIO(png)).convert('RGB').getpixel((1, 1))
        # where to read each glass: a spot with no text or icon on it
        spots = {
            'area label (ink text)': ".stage__area",          # read just left of the text, inside the group
            'hint pill (ink text)': ".stage__passes",
            'view switch, unchosen (ink text)': ".view-switch__option:not(.is-current)",
            'room tab, not open (ink text)': ".room-tab:not(.is-current)",
            'score (ink text)': ".feng__inner",
        }
        # the glass panels: open the lighting panel, which shares its glass with the layers panel and the score card
        await pg.get_by_role('button', name='Lighting').click(); await pg.wait_for_timeout(400)
        spots['lighting panel (ink text)'] = '.feng__card.light'
        await pg.screenshot(path=OUT+'glass-panel.png')
        for name, colour in [('black', '#000'), ('navy', '#0a1a4a'), ('tomato', '#ff4f2b'), ('white', '#fff')]:
            await pg.add_style_tag(content=f".stage canvas{{visibility:hidden}} .stage{{background:{colour} !important}} html,body,#root,#root>*,.app,.workspace,.topbar,header,main{{background:{colour} !important}}")
            await pg.wait_for_timeout(500)
            row = {}
            for label, sel in spots.items():
                box = await pg.locator(sel).first.bounding_box()
                # 3 px inside the left edge, at mid height: on the glass, off the glyphs
                # the score is a ring with the number in the middle: read the glass between the two
                px = await pixel(box['x'] + (9 if 'score' in label else 3), box['y'] + box['height'] / 2)
                row[label] = [list(px), contrast(px, INK)]
            box = await pg.locator('.view-switch__option.is-current').bounding_box()
            px = await pixel(box['x'] + 5, box['y'] + box['height'] / 2)
            row['view switch, chosen (white text)'] = [list(px), contrast(px, WHITE)]
            r[name] = row
            if name == 'black': await pg.screenshot(path=OUT+'glass-on-black.png')
        for name in ('black', 'navy', 'tomato', 'white'):
            for label, (px, c) in r[name].items():
                r['worst'][label] = min(r['worst'].get(label, 99), c)
        r['passes_AA'] = all(c >= 4.5 for c in r['worst'].values())
        r['errors'] = logs[:5]
        print(json.dumps({k: r[k] for k in ('filter', 'worst', 'passes_AA', 'errors')}, indent=1))
        print(json.dumps(r['black'])); print(json.dumps(r['white']))
        await b.close()
asyncio.run(main())
