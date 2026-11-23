import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width':1440,'height':900})
        pg = await ctx.new_page(); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2000)
        # moodboard search
        r['pins0'] = await pg.locator('.pin-card').count()
        await pg.locator('.board-tools__search input').fill('sofa blue'); await pg.wait_for_timeout(200)
        r['pins_blue_sofa'] = await pg.locator('.pin-card').count()
        await pg.locator('.board-tools__search input').fill('zzz'); await pg.wait_for_timeout(200)
        r['empty'] = await pg.locator('.board-empty').inner_text()
        await pg.locator('.board-tools__search input').fill('')
        await pg.locator('.pin').first.click(); await pg.wait_for_timeout(200)
        await pg.get_by_role('tab', name='Picked').click(); await pg.wait_for_timeout(200)
        r['pins_picked'] = await pg.locator('.pin-card').count()
        await pg.get_by_role('tab', name='In 3D').click(); await pg.wait_for_timeout(200)
        r['pins_3d'] = await pg.locator('.pin-card').count()
        r['explore'] = await pg.locator('.board-tools__explore').get_attribute('href')
        await pg.screenshot(path=OUT+'board-search.png')
        # persistence: add a room with a moodboard piece and a floor photo, reload
        await pg.locator('.room-tab--add').click(); await pg.get_by_role('button', name='Add room').click(); await pg.wait_for_timeout(500)
        await pg.locator('.pin__add').first.click(); await pg.wait_for_timeout(300); await pg.keyboard.press('Escape')
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click()
        await pg.get_by_role('button', name='Sage').click()
        await pg.get_by_role('button', name='Your photo').first.click()
        await pg.set_input_files('#floor-photo', OUT+'test-floor.jpg'); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Use this').click(); await pg.wait_for_timeout(1800)
        r['stored_kb'] = await pg.evaluate("Math.round((localStorage.getItem('apt-studio-home')||'').length/1024)")
        await pg.reload(); await pg.wait_for_timeout(2500)
        r['tabs_after_reload'] = await pg.locator('.room-tab').all_inner_texts()
        r['area_after_reload'] = await pg.locator('.stage__area').inner_text()
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'reload-room.png')
        # damaged storage does not break the app
        await pg.evaluate("localStorage.setItem('apt-studio-home', '{bad')"); await pg.reload(); await pg.wait_for_timeout(2000)
        r['tabs_after_bad'] = await pg.locator('.room-tab').all_inner_texts()
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
