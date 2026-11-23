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
        home = lambda: pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}').rooms?.[0]?.size")
        await pg.screenshot(path=OUT+'door-0-plan.png')
        # the plan: room is 3.6 x 3 m, drawn centred in the stage. Find the scale from the stage size.
        box = await pg.locator('.stage').bounding_box()
        cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
        # measure pixels per metre from the two dimension labels is hard; use the known layout: room 3.6 m spans ~402 px at this size
        ppm = 402/3.6
        # window on the back wall at x = +0.61 m; drag it left by 1.2 m
        wx, wy = cx + 0.61*ppm, cy - 1.5*ppm - 0.05*ppm
        await pg.mouse.move(wx, wy); await pg.mouse.down(); await pg.mouse.move(wx - 0.6*ppm, wy+10, steps=6); await pg.mouse.move(wx - 1.2*ppm, wy+10, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        size = await home(); r['window_along_after_drag'] = round(size['windows'][0]['along'], 2)
        # door on the left wall near the front (z = +1.06 m); drag it toward the back by 1 m
        dx, dy = cx - 1.8*ppm - 0.05*ppm, cy + 1.06*ppm
        await pg.mouse.move(dx, dy); await pg.mouse.down(); await pg.mouse.move(dx+10, dy - 0.5*ppm, steps=6); await pg.mouse.move(dx+10, dy - 1.0*ppm, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        size = await home(); r['door_along_after_drag'] = round(size['doors'][0]['along'], 2)
        await pg.screenshot(path=OUT+'door-1-dragged.png')
        # add a door from the menu, on the front wall
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='+ Add a door').click(); await pg.wait_for_timeout(1200)
        size = await home(); r['doors'] = [(d['wall'], round(d['along'],2)) for d in size['doors']]
        await pg.get_by_role('button', name='Floor, walls, windows and doors').click()
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'door-2-3d.png')
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(3000)
        await pg.mouse.move(500, 300); await pg.mouse.down(); await pg.mouse.move(250, 300, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'door-3-inside.png')
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
