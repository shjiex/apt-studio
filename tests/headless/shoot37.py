import asyncio, json, subprocess
from playwright.async_api import async_playwright
OUT='/home/claude/shots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
NODE = """
import('./src/lib/room.js').then((m) => {
  const size = { width: 3.6, length: 3 };
  const room = { ...size, height: 2.5, windows: m.defaultWindows(size), doors: m.defaultDoors(size) };
  const door = m.doorOpening(room.doors[0], room);
  const blocks = m.wallBlocks(3, 2.5, [door], 0);
  // the wall must be open from the floor to 2 m across the door, and solid above it
  const overDoor = blocks.filter(([from, to]) => Math.abs(from - (door.u - door.half)) < 1e-6 && Math.abs(to - (door.u + door.half)) < 1e-6);
  const zoneLeft = m.doorZone({ ...room.doors[0], hinge: 'left' }, room), zoneRight = m.doorZone({ ...room.doors[0], hinge: 'right' }, room);
  console.log(JSON.stringify({ blocks: blocks.length, overDoor, sameZone: JSON.stringify(zoneLeft) === JSON.stringify(zoneRight) }));
});
"""
async def main():
    r = {}
    r['node'] = json.loads(subprocess.run(['node', '--input-type=module', '-e', NODE], cwd='/home/claude/apt-studio-app', capture_output=True, text=True).stdout)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1440,'height':900}); logs=[]
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        async def door():
            await pg.wait_for_timeout(1100)
            return await pg.evaluate("JSON.parse(localStorage.getItem('apt-studio-home')||'{}').rooms?.[0]?.size.doors[0]")
        clip={'x':40,'y':144,'width':948,'height':512}
        menu = pg.get_by_role('button', name='Floor, walls, windows and doors')
        await menu.click(); await pg.wait_for_timeout(300)
        card = pg.locator('.light__fixed').filter(has_text='Door 1')
        await card.get_by_role('button', name='Right', exact=True).last.click()   # the last "Right" on the card is the hinge
        d = await door(); r['hinge'] = d.get('hinge'); r['wall_still'] = d['wall']
        await menu.click(); await pg.screenshot(path=OUT+'hinge-plan.png', clip=clip)
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(2500)
        await pg.mouse.click(760, 645); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'hinge-inside-open.png', clip=clip)
        await menu.click(); await pg.wait_for_timeout(300)
        await card.get_by_role('button', name='Shut', exact=True).click()
        d = await door(); r['shut'] = d.get('shut')
        await menu.click(); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT+'hinge-inside-shut.png', clip=clip)
        await pg.keyboard.press('Control+z'); d = await door(); r['shut_after_undo'] = bool(d.get('shut'))
        r['errors'] = logs[:5]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
