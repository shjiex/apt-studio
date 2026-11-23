import asyncio, json
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        async def size():
            await pg.wait_for_timeout(1100)
            return await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}').rooms?.[0]?.size")
        async def surfaces():
            return await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}').rooms?.[0]?.surfaces")
        await pg.screenshot(path=OUT+'handles-plan.png', clip={'x':40,'y':144,'width':948,'height':512})
        box = await pg.locator('.stage').bounding_box(); cx, cy = box['x']+box['width']/2, box['y']+box['height']/2; ppm = 402/3.6
        # 1. drag the window, then undo with the keyboard: it goes back
        wx, wy = cx + 0.61*ppm, cy - 1.5*ppm - 0.05*ppm
        await pg.mouse.move(wx, wy); await pg.mouse.down(); await pg.mouse.move(wx - 0.6*ppm, wy+10, steps=6); await pg.mouse.move(wx - 1.2*ppm, wy+10, steps=6); await pg.mouse.up()
        r['window_dragged'] = round((await size())['windows'][0]['along'], 2)
        await pg.keyboard.press('Control+z'); r['window_after_undo'] = round((await size())['windows'][0]['along'], 2)
        await pg.keyboard.press('Control+Shift+z'); r['window_after_redo'] = round((await size())['windows'][0]['along'], 2)
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
        # 2. add a door: toast, undo from the toast
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='+ Add a door').click(); await pg.wait_for_timeout(400)
        r['toast'] = (await pg.locator('.toast').inner_text()).replace('\n', ' | ')
        r['doors_after_add'] = len((await size())['doors'])
        await pg.locator('.toast').get_by_role('button', name='Undo').click()
        r['doors_after_undo'] = len((await size())['doors'])
        # 3. overlap: put door 1 on the back wall, where the window is (window: along 0.67, 1.2 m wide, wall 3.6 m)
        door_card = pg.locator('.light__fixed').filter(has_text='Door 1')
        await door_card.get_by_role('button', name='Back', exact=True).click()
        s = await size(); d = s['doors'][0]; w = s['windows'][0]
        r['door_on_back'] = [d['wall'], round(d['along'], 3)]
        gap = abs(d['along'] - w['along'])*3.6 - (d['width']+w['width'])/2
        r['gap_m'] = round(gap, 3)
        # slide the door right over the window with its slider: it must stay clear
        await pg.evaluate("""() => { const card = [...document.querySelectorAll('.light__fixed')].find(c => c.textContent.includes('Door 1')); const el = card.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '0.6'); el.dispatchEvent(new Event('input', { bubbles: true })); }""")
        s = await size(); d = s['doors'][0]
        r['door_after_slider'] = round(d['along'], 3); r['gap_after_slider_m'] = round(abs(d['along'] - w['along'])*3.6 - (d['width']+w['width'])/2, 3)
        # 4. paint name
        await pg.get_by_role('button', name='Sage').click(); await pg.wait_for_timeout(300)
        r['paint'] = (await pg.locator('.surface__paint-name').inner_text()).replace('\n', ' ')
        await pg.screenshot(path=OUT+'handles-panel.png')
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
