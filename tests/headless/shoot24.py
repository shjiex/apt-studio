import asyncio, json, base64
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
QUAD=[(330/999,190/749),(760/999,230/749),(930/999,640/749),(90/999,560/749)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2000)
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(2000)
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click()
        await pg.get_by_role('button', name='Your photo').first.click()
        await pg.set_input_files('#floor-photo', OUT+'test-floor-angle.jpg'); await pg.wait_for_timeout(800)
        box = await pg.locator('.straighten').bounding_box()
        handles = pg.locator('.straighten__corner')
        for i,(fx,fy) in enumerate(QUAD):
            hb = await handles.nth(i).bounding_box()
            await pg.mouse.move(hb['x']+12, hb['y']+12); await pg.mouse.down()
            await pg.mouse.move(box['x']+fx*box['width'], box['y']+fy*box['height'], steps=6); await pg.mouse.up()
        await pg.locator('#straighten-across').fill('2.4'); await pg.locator('#straighten-second').fill('1.8')
        await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'straighten-dialog.png')
        await pg.get_by_role('button', name='Use this').click(); await pg.wait_for_timeout(1500)
        r['span'] = await pg.locator('.light__row strong').first.inner_text()
        src = await pg.locator('.surface__photo img').get_attribute('src')
        open(OUT+'straightened.jpg','wb').write(base64.b64decode(src.split(',',1)[1]))
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'straighten-room.png')
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
