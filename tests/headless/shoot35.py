import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'stand-a.png')
        await pg.mouse.click(760, 645); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'stand-b.png')
        # a drag must still only turn the view, not move you
        await pg.mouse.move(600, 400); await pg.mouse.down(); await pg.mouse.move(450, 400, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'stand-c.png')
        print(json.dumps(logs)); await b.close()
asyncio.run(main())
