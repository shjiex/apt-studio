import asyncio, json, sys
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
        # furnish a little: sofa, lamp, plant, rug via tiles
        for name in ['Sofa','Floor lamp','Plant','Rug','Low bookcase']:
            await pg.locator('.strip-area .strip-search input').fill(name); await pg.wait_for_timeout(150)
            await pg.locator('.tile').first.click(); await pg.wait_for_timeout(250); await pg.keyboard.press('Escape')
        await pg.locator('.strip-area .strip-search input').fill('')
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=OUT+'real-3d.png')
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=OUT+'real-inside.png')
        # look around by dragging on a wall
        await pg.mouse.move(500, 250); await pg.mouse.down(); await pg.mouse.move(800, 270, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'real-inside-turned.png')
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
