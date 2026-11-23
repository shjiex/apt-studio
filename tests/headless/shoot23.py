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
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2000)
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Your photo').first.click(); await pg.wait_for_timeout(200)
        await pg.set_input_files('#floor-photo', OUT+'test-floor.jpg'); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Use this').click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'surf-floor.png')
        await pg.get_by_role('button', name='Sage').click(); await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT+'surf-paint.png')
        await pg.get_by_role('button', name='Your photo').nth(1).click(); await pg.wait_for_timeout(200)
        await pg.set_input_files('#wall-photo', OUT+'test-wall.jpg'); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Use this').click(); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'surf-wall.png')
        async with pg.expect_download() as dl:
            await pg.get_by_role('button', name='Download').click(); await pg.wait_for_timeout(200)
            await pg.get_by_text('Room file').click()
        d = await dl.value; await d.save_as(OUT+'room-surfaces.json')
        await pg.get_by_role('tab', name='2D', exact=True).click(); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'surf-2d.png')
        # a second room keeps its own surfaces
        await pg.locator('.room-tab--add').click(); await pg.get_by_role('button', name='Add room').click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'surf-room2.png')
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
