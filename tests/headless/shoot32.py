import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def setr(pg, scope, label, value):
    await pg.evaluate("""([scope, label, value]) => { const cards=[...document.querySelectorAll('.light__fixed')].filter(c=>c.textContent.includes(scope)); const el = cards[0].querySelector(`input[aria-label="${label}"]`); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, value); el.dispatchEvent(new Event('input', {bubbles:true})); }""", [scope, label, str(value)])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2000)
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'win-0-default.png')
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='+ Add a window').click(); await pg.wait_for_timeout(300)
        r['cards'] = await pg.locator('.light__fixed').count()
        # window 2: on the left wall, wide, low sill
        card = pg.locator('.light__fixed', has_text='Window 2')
        await card.get_by_role('button', name='Left').click()
        await setr(pg, 'Window 2', 'Width', 1.8); await setr(pg, 'Window 2', 'Bottom edge', 0.3); await setr(pg, 'Window 2', 'Along the wall', 0.4)
        await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'win-1-left.png')
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click()
        await pg.get_by_role('tab', name='2D', exact=True).click(); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'win-2-plan.png')
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(3000)
        await pg.mouse.move(500, 300); await pg.mouse.down(); await pg.mouse.move(650, 300, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'win-3-inside.png')
        # room score still works, reload keeps windows
        await pg.wait_for_timeout(1200); await pg.reload(); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(300)
        r['cards_after_reload'] = await pg.locator('.light__fixed').count()
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
