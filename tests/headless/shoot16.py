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
        r['moodboard_at_start'] = await pg.locator('.moodboard').count(); r['score0'] = await pg.locator('.feng__circle strong').inner_text()
        for i in (0, 6):
            await pg.locator('.tile').nth(i).click(); await pg.wait_for_timeout(600)
        r['panel'] = await pg.locator('.piece-panel').count(); r['moodboard_hidden'] = await pg.locator('.moodboard').count() == 0
        r['name'] = await pg.locator('.piece-panel h2').inner_text(); r['facts'] = (await pg.locator('.piece-panel__facts').nth(1).inner_text()).replace('\n',' ')
        await pg.get_by_role('button', name='Rotate').click(); await pg.wait_for_timeout(400)
        r['after_rotate'] = (await pg.locator('.piece-panel__facts').nth(1).inner_text()).replace('\n',' ')
        await pg.locator('.feng__circle').click(); await pg.wait_for_timeout(300); r['checks'] = await pg.locator('.feng__checks li').count()
        await pg.screenshot(path=OUT+'r12-panel.png')
        await pg.locator('.feng__circle').click(); await pg.get_by_role('button', name='Duplicate').click(); await pg.wait_for_timeout(400)
        r['toast'] = (await pg.locator('.toast').inner_text()).replace('\n',' | ')
        await pg.get_by_role('button', name='Close').click(); await pg.wait_for_timeout(300); r['moodboard_back'] = await pg.locator('.moodboard').count()
        r['bar_visible'] = await pg.locator('.selection-bar').is_visible() if await pg.locator('.selection-bar').count() else False
        r['errors'] = logs[:6]; print(json.dumps(r, indent=1, ensure_ascii=False)); await b.close()
asyncio.run(main())
