import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        r['tabs0'] = await pg.locator('.room-tab').all_inner_texts()
        await pg.screenshot(path=OUT+'rooms-1.png')
        # add a living room
        await pg.locator('.room-tab--add').click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT+'rooms-dialog.png')
        await pg.get_by_role('button', name='Add room').click(); await pg.wait_for_timeout(600)
        r['tabs1'] = await pg.locator('.room-tab').all_inner_texts()
        r['area1'] = await pg.locator('.stage__area').inner_text()
        # search and add a sofa
        await pg.locator('.strip-area .strip-search input').fill('sof'); await pg.wait_for_timeout(200)
        r['search_tiles'] = await pg.locator('.tile').count()
        await pg.locator('.tile').first.click(); await pg.wait_for_timeout(400)
        await pg.keyboard.press('Escape')
        await pg.locator('.strip-area .strip-search input').fill('zzz'); await pg.wait_for_timeout(200)
        r['empty'] = await pg.locator('.strip__empty').inner_text()
        await pg.locator('.strip-group').nth(0).click(); await pg.wait_for_timeout(200)
        r['all_tiles'] = await pg.locator('.tile').count()
        # lighting only in this room: turn daylight off
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=OUT+'rooms-living-3d.png')
        # back to bedroom
        await pg.locator('.room-tab').nth(0).click(); await pg.wait_for_timeout(2500)
        r['area0'] = await pg.locator('.stage__area').inner_text()
        await pg.screenshot(path=OUT+'rooms-bedroom-3d.png')
        # edit: rename + kind
        await pg.locator('.room-tab').nth(0).click(); await pg.wait_for_timeout(300)
        await pg.locator('#room-name').fill('Main bedroom')
        await pg.get_by_role('button', name='Save room').click(); await pg.wait_for_timeout(400)
        r['tabs2'] = await pg.locator('.room-tab').all_inner_texts()
        # remove the living room
        await pg.locator('.room-tab').nth(1).click(); await pg.wait_for_timeout(500)
        await pg.locator('.room-tab').nth(1).click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Remove this room').click(); await pg.wait_for_timeout(500)
        r['tabs3'] = await pg.locator('.room-tab').all_inner_texts()
        # home rename
        await pg.locator('.home-chip').click(); await pg.locator('.home-chip input').fill('Capitol Hill'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        r['home'] = await pg.locator('.home-chip').inner_text()
        # phone width
        await pg.set_viewport_size({'width':390,'height':800}); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'rooms-phone.png')
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
