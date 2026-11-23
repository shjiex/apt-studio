# The 2:46 pm round: score button size, the score card in steps, the flowing view switch, the pressed state.
import asyncio, json
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        z = await pg.locator('.stage__zoom').bounding_box(); s = await pg.locator('.feng__circle').bounding_box(); h = await pg.locator('.stage__history').bounding_box()
        r['zoom_x_w'] = [round(z['x']), round(z['width'])]; r['score_x_w_h'] = [round(s['x']), round(s['width']), round(s['height'])]; r['history_h'] = round(h['height']); r['gap_zoom_to_score'] = round(s['y'] - (z['y'] + z['height']))
        r['bottoms_score_history'] = [round(s['y'] + s['height']), round(h['y'] + h['height'])]
        r['score_text'] = await pg.locator('.feng__circle').inner_text()
        # pressed, checked on the plan, where the page is not busy drawing 3D frames
        box = await pg.locator('.stage__zoom .btn').first.bounding_box()
        await pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(250)
        r['pressed'] = await pg.evaluate("(([x, y]) => { const el = document.querySelector('.stage__zoom .btn'); const c = getComputedStyle(el); const at = document.elementFromPoint(x, y); return [c.transform, c.boxShadow.slice(0, 44), el.matches(':active'), at && at.className && String(at.className.baseVal ?? at.className).slice(0, 40)]; })", [box['x'] + box['width'] / 2, box['y'] + box['height'] / 2])
        await pg.mouse.up()
        await pg.locator('.feng__circle').click(); await pg.wait_for_timeout(500)
        r['card'] = (await pg.locator('.feng__card').inner_text()).replace('\n', ' | ')[:300]
        r['folds_closed'] = await pg.locator('.feng__fold:not([open])').count()
        await pg.screenshot(path='/home/claude/shots/card-closed.png', clip={'x':560,'y':150,'width':450,'height':520})
        await pg.locator('.feng__fold > summary').first.click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/home/claude/shots/card-open.png', clip={'x':560,'y':150,'width':450,'height':520})
        await pg.locator('.feng__circle').click()
        t0 = await pg.locator('.view-switch__thumb').bounding_box()
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(120)
        tm = await pg.locator('.view-switch__thumb').bounding_box(); await pg.wait_for_timeout(900)
        t1 = await pg.locator('.view-switch__thumb').bounding_box(); o = await pg.locator('.view-switch__option.is-current').bounding_box()
        r['thumb_x_start_mid_end'] = [round(t0['x']), round(tm['x']), round(t1['x'])]; r['thumb_on_option'] = abs(t1['x'] - o['x']) < 1.5 and abs(t1['width'] - o['width']) < 1.5
        r['errors'] = logs[:5]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
