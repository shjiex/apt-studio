# Glass round 2: the toast (dark glass, white text) and the phone tab bar (light glass, ink text) over black and white.
import asyncio, json, io
from playwright.async_api import async_playwright
from PIL import Image
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
def lum(rgb):
    lin=lambda c: (c/255)/12.92 if c/255<=0.03928 else ((c/255+0.055)/1.055)**2.4
    return 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2])
def contrast(a,b):
    la,lb=lum(a),lum(b); return round((max(la,lb)+0.05)/(min(la,lb)+0.05),2)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS); r={}
        pg = await b.new_page(viewport={'width':390,'height':844}); logs=[]
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:200]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        async def pixel(x, y):
            png = await pg.screenshot(clip={'x': x-2, 'y': y-2, 'width': 4, 'height': 4}); return Image.open(io.BytesIO(png)).convert('RGB').getpixel((1,1))
        await pg.screenshot(path='/home/claude/shots/glass-phone.png')
        for name, colour in [('black', '#000'), ('white', '#fff')]:
            await pg.add_style_tag(content=f"html,body,#root,#root>*,#root>*>*:not(.tab-bar):not(.toast),main,section,.stage,.strip-area{{background:{colour} !important}} canvas{{visibility:hidden}}")
            await pg.wait_for_timeout(400)
            box = await pg.locator('.tab-bar button:not(.is-current)').first.bounding_box()
            px = await pixel(box['x'] + 4, box['y'] + box['height']/2); r[f'tab bar over {name}, ink text'] = contrast(px, (15,15,14))
        # a toast: add a piece from the strip, then read the toast's own colour
        await pg.close()
        ctx = await b.new_context(viewport={'width':1440,'height':900}); pg2 = await ctx.new_page()
        pg2.on('pageerror', lambda e: logs.append('PAGEERROR2 '+str(e)[:200]))
        await pg2.goto('http://localhost:4173/'); await pg2.wait_for_timeout(3500)
        await pg2.locator('.strip-area .strip-search input').fill('Plant'); await pg2.wait_for_timeout(300)
        await pg2.locator('.tile').first.click(); await pg2.wait_for_timeout(600)
        for name, colour in [('black', '#000'), ('white', '#fff')]:
            await pg2.add_style_tag(content=f"html,body,#root,#root>*,#root>*>*:not(.tab-bar):not(.toast),main,section,.stage,.strip-area{{background:{colour} !important}} canvas{{visibility:hidden}}")
            await pg2.wait_for_timeout(400)
            box = await pg2.locator('.toast').bounding_box()
            if box:
                png = await pg2.screenshot(clip={'x': box['x']+12, 'y': box['y']+box['height']/2-2, 'width': 4, 'height': 4}); px = Image.open(io.BytesIO(png)).convert('RGB').getpixel((1,1))
                r[f'toast over {name}, white text'] = contrast(px, (255,255,255))
        r['all_AA'] = all(v >= 4.5 for v in r.values() if isinstance(v, float)); r['errors'] = logs[:4]
        print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
