# Round 13: the welcome questions, the tour of tips, wall decor, feet and inches,
# and the contrast of the icons and words that sit on the new glass.
import asyncio, json, io, re
from playwright.async_api import async_playwright
from PIL import Image
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
SEEN="localStorage.setItem('apt-studio-welcomed','yes'); localStorage.setItem('apt-studio-toured','yes');"
def lum(rgb):
    lin=lambda c: (c/255)/12.92 if c/255<=0.03928 else ((c/255+0.055)/1.055)**2.4
    return 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2])
def contrast(a,b):
    la,lb=lum(a),lum(b); return round((max(la,lb)+0.05)/(min(la,lb)+0.05),2)
def parse(colour):
    return tuple(int(float(n)) for n in re.findall(r'[\d.]+', colour)[:3])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS); r={}; logs=[]

        # 1. A first visit: the welcome shows, skipping it opens the ready bedroom and the tour.
        pg = await b.new_page(viewport={'width':1440,'height':900})
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:200]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        r['welcome_shows'] = await pg.get_by_text('How would you like to start?').count() == 1
        r['scan_is_off'] = await pg.locator('.welcome__choice.is-off').count() == 1
        await pg.get_by_text('Skip and start').click(); await pg.wait_for_timeout(1200)
        r['tip_1'] = (await pg.locator('.tip__count').inner_text()).strip()
        tip = await pg.locator('.tip').bounding_box(); ring = await pg.locator('.tip__ring').bounding_box()
        r['tip_on_screen'] = tip['x'] >= 0 and tip['y'] >= 0 and tip['x']+tip['width'] <= 1440 and tip['y']+tip['height'] <= 900
        overlap = not (tip['x']+tip['width'] <= ring['x'] or ring['x']+ring['width'] <= tip['x'] or tip['y']+tip['height'] <= ring['y'] or ring['y']+ring['height'] <= tip['y'])
        r['tip_covers_its_control'] = overlap
        # the tip card is glass over the stage: measure its words over black and white
        for name, colour in [('black', '#000'), ('white', '#fff')]:
            await pg.add_style_tag(content=f".stage{{background:{colour} !important}} .stage canvas{{visibility:hidden}}")
            await pg.wait_for_timeout(400)
            box = await pg.locator('.tip').bounding_box()
            png = await pg.screenshot(clip={'x': box['x']+6, 'y': box['y']+box['height']/2, 'width': 4, 'height': 4})
            ink = parse(await pg.locator('.tip p').last.evaluate('el => getComputedStyle(el).color'))
            r[f'tip words over {name}'] = contrast(Image.open(io.BytesIO(png)).convert('RGB').getpixel((1,1)), ink)
        for _ in range(5): await pg.get_by_role('button', name='Next', exact=True).click(); await pg.wait_for_timeout(350)
        r['tip_last'] = (await pg.locator('.tip__count').inner_text()).strip()
        await pg.get_by_role('button', name='Done', exact=True).click(); await pg.wait_for_timeout(400)
        r['tour_remembered'] = await pg.evaluate("localStorage.getItem('apt-studio-toured')") is not None
        await pg.close()

        # 2. A later visit: no welcome. Wall decor goes on a wall, and feet and inches show.
        ctx = await b.new_context(viewport={'width':1440,'height':900}); pg = await ctx.new_page()
        await pg.add_init_script(SEEN)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR2 '+str(e)[:200]))
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        r['no_welcome_later'] = await pg.locator('.welcome').count() == 0
        await pg.get_by_text('Wall decor', exact=True).first.click(); await pg.wait_for_timeout(500)
        r['wall_decor_tiles'] = await pg.locator('.tile').count()
        await pg.locator('.tile').first.click(); await pg.wait_for_timeout(900)
        piece = await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')).rooms[0].pieces.at(-1)")
        r['wall_piece'] = {'type': piece.get('type'), 'wall': piece.get('wall'), 'hang': piece.get('hang')}
        r['above_floor_field'] = await pg.get_by_text('Above floor').count() >= 1
        # icons on glass over the stage, with a piece selected so the two buttons over it show
        async def glass(label, selector):
            for name, colour in [('black', '#000'), ('white', '#fff')]:
                await pg.add_style_tag(content=f".stage{{background:{colour} !important}} .stage canvas{{visibility:hidden}}")
                await pg.wait_for_timeout(400)
                el = pg.locator(selector).first
                if await el.count() == 0: r[f'{label} over {name}'] = 'not found'; continue
                box = await el.bounding_box()
                png = await pg.screenshot(clip={'x': box['x']+6, 'y': box['y']+box['height']/2-2, 'width': 4, 'height': 4})
                ink = parse(await el.evaluate('el => getComputedStyle(el).color'))
                r[f'{label} over {name}'] = contrast(Image.open(io.BytesIO(png)).convert('RGB').getpixel((1,1)), ink)
        await glass('lighting button', '.stage__tools button[aria-label="Lighting"]')
        await glass('view switch, unchosen icon', '.view-switch__option:not(.is-current)')
        await glass('download button', '.stage__corner .btn')
        await glass('rotate over the piece', '.stage__action')
        await glass('remove over the piece', '.stage__action--remove')
        await glass('area label', '.stage__area')
        # the top bar is glass over the page itself, so it is measured as it stands
        for label, selector in [('home chip', '.home-chip'), ('room tab, unchosen or chosen', '.room-tabs__list button'), ('settings button', '.top-bar .btn--glass')]:
            el = pg.locator(selector).first; box = await el.bounding_box()
            png = await pg.screenshot(clip={'x': box['x']+5, 'y': box['y']+box['height']/2-2, 'width': 4, 'height': 4})
            ink = parse(await el.evaluate('el => getComputedStyle(el).color'))
            r[f'{label} on the page'] = contrast(Image.open(io.BytesIO(png)).convert('RGB').getpixel((1,1)), ink)
        await pg.keyboard.press('Escape')
        await pg.get_by_role('button', name='Preferences').click(); await pg.wait_for_timeout(400)
        await pg.get_by_text('Imperial', exact=True).click(); await pg.wait_for_timeout(500)
        r['area_in_feet'] = (await pg.locator('.stage__area').inner_text()).strip()
        r['all_AA'] = all(v >= 4.5 for k, v in r.items() if isinstance(v, float) and 'icon' not in k and 'button' not in k and 'over the piece' not in k)
        r['icons_3_to_1'] = all(v >= 3 for k, v in r.items() if isinstance(v, float))
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
