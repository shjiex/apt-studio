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
        r['tiles'] = await pg.locator('.tile').count(); r['pin_add'] = await pg.locator('.pin__add').count()
        await pg.locator('.pin__add').first.click(); await pg.wait_for_timeout(600)
        r['bar'] = (await pg.locator('.selection-bar').inner_text()).replace('\n',' | ')[:120]
        await pg.keyboard.press('Escape')
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=OUT+'r3-3d.png')
        await pg.goto('http://localhost:4173/login'); await pg.wait_for_timeout(1200)
        r['login_notice'] = 'not set up' in (await pg.inner_text('body'))
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
