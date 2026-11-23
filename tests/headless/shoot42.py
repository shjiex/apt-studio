# The example room: open it from the add-room dialog and look at it in all three views.
# Run against a build served on port 4177 (see the bottom of this file for the port).
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '4177'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]; r={}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type=='error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/'); await pg.wait_for_timeout(2500)
        r['tabs_before'] = await pg.locator('.room-tab:not(.room-tab--add)').count()
        await pg.locator('.room-tab--add').click(); await pg.wait_for_timeout(500)
        r['block'] = await pg.locator('.example-room').inner_text()
        r['picture_loaded'] = await pg.locator('.example-room__picture').evaluate('img => img.complete && img.naturalWidth > 0')
        box = await pg.locator('.dialog').bounding_box()
        r['dialog_height'] = round(box['height'])
        await pg.screenshot(path='/tmp/example-dialog.png', clip=box)
        await pg.get_by_role('button', name='Open the example room').click(); await pg.wait_for_timeout(1500)
        r['tabs_after'] = await pg.locator('.room-tab:not(.room-tab--add)').count()
        r['tab_texts'] = await pg.locator('.room-tab:not(.room-tab--add)').all_inner_texts()
        r['dialog_closed'] = await pg.locator('.dialog').count() == 0
        r['toast'] = await pg.get_by_text('The example room is open').count()
        r['area'] = await pg.locator('.stage__area').inner_text()
        # the home as the browser saved it: count the pieces of the room that is open
        saved = await pg.evaluate('''() => { for (const key of Object.keys(localStorage)) { try { const home = JSON.parse(localStorage.getItem(key)); if (home && home.rooms) { const room = home.rooms.find((entry) => entry.id === home.activeRoomId); return { key, pieces: room.pieces.map((piece) => piece.type), window: room.size.windows[0].wall, door: room.size.doors[0].wall, wall: room.surfaces.wall.color, hour: room.lighting.hour }; } } catch (error) {} } return null; }''')
        r['saved'] = saved
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='/tmp/example-plan.png')
        await pg.get_by_role('tab', name='3D', exact=True).click(); await pg.wait_for_timeout(7000)
        await pg.screenshot(path='/tmp/example-3d.png')
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(7000)
        await pg.screenshot(path='/tmp/example-inside.png')
        r['errors'] = logs
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main())
