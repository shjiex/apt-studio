# Smoke test: the app loads past the welcome, tiles are there, a piece is added from a tile,
# the 3D view opens, the login page opens, and the console stays clean.
import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
# The welcome questions and the tour show on a first visit. These two lines mark them as seen.
SEEN="localStorage.setItem('apt-studio-welcomed','yes'); localStorage.setItem('apt-studio-toured','yes');"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        await pg.add_init_script(SEEN)
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        r['tiles'] = await pg.locator('.tile').count(); r['pins'] = await pg.locator('.pin').count()
        before = await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}')?.rooms?.[0]?.pieces?.length ?? null")
        await pg.locator('.tile').first.click(); await pg.wait_for_timeout(900)
        after = await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}')?.rooms?.[0]?.pieces?.length ?? null")
        r['pieces_before'] = before; r['pieces_after'] = after
        r['piece_panel'] = await pg.locator('.piece-panel').count()
        await pg.keyboard.press('Escape')
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=OUT+'smoke-3d.png')
        await pg.goto('http://localhost:4173/login'); await pg.wait_for_timeout(1200)
        r['login_notice'] = 'switched on' in (await pg.inner_text('body'))
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
