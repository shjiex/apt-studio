import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def setr(pg, label, value):
    await pg.evaluate("""([label, value]) => { const el = document.querySelector(`input[aria-label="${label}"]`); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, value); el.dispatchEvent(new Event('input', {bubbles:true})); }""", [label, str(value)])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2000)
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Lighting').click(); await pg.wait_for_timeout(300)
        shots=[]
        for month, hour, name in [('June', 12, 'jun-noon'), ('December', 12, 'dec-noon'), ('June', 18.5, 'jun-evening')]:
            await pg.get_by_role('button', name=month, exact=True).click(); await setr(pg, 'Time of day', hour); await pg.wait_for_timeout(900)
            r[name] = (await pg.locator('.light__row', has_text='Time').inner_text()).replace('\n',' ')
            await pg.screenshot(path=OUT+f'sun-{name}.png'); shots.append(name)
        r['note'] = await pg.locator('.feng__note').first.inner_text()
        await pg.locator('.light__select').select_option(label='Sydney'); await pg.wait_for_timeout(500)
        r['sydney'] = (await pg.locator('.light__row', has_text='Where').inner_text()).replace('\n',' ')[:30]
        r['sydney_time'] = (await pg.locator('.light__row', has_text='Time').inner_text()).replace('\n',' ')
        # night with a dimmed ceiling light, seen in 2D
        await pg.locator('.light__select').select_option(label='Seattle')
        await setr(pg, 'Time of day', 22); await pg.get_by_role('button', name='+ Ceiling light').click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'night-full.png')
        await pg.evaluate("""() => { const rows=[...document.querySelectorAll('.light__fixed .light__row')].filter(r=>r.textContent.includes('Dimmer')); const el=rows[0].querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '30'); el.dispatchEvent(new Event('input', {bubbles:true})); }""")
        await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'night-dim.png')
        await pg.get_by_role('button', name='Lighting').click()
        await pg.get_by_role('tab', name='2D', exact=True).click(); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'night-2d.png')
        # start over
        await pg.locator('.room-tab--add').click(); await pg.get_by_role('button', name='Add room').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button', name='Start over').click(); await pg.screenshot(path=OUT+'start-over.png')
        await pg.get_by_role('button', name='Yes, clear').click(); await pg.wait_for_timeout(500)
        r['tabs_after_start_over'] = await pg.locator('.room-tab').all_inner_texts()
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
