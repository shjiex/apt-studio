import sys
# Moodboard: every piece of furniture in a picture has an outline that is a button, and a
# card of furniture to choose from. Checks the keyboard path, the pointer path, Add, the
# three ways to close, and that pressing the picture beside the furniture still picks the pin.
import asyncio, json
from playwright.async_api import async_playwright
OUT = '/home/claude/shots/'
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'  # the address of the built app
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

# how many pieces the saved home holds (every list called "pieces", in every room)
COUNT = """(() => { const home = JSON.parse(localStorage.getItem('apt-studio-home') || 'null'); let n = 0;
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { if (k === 'pieces' && Array.isArray(x)) n += x.length; else walk(x); } } };
  walk(home); return n; })()"""

# a point on the screen that is inside the outline `sel` (index i), found by trying a grid over its box
INSIDE = """([sel, i]) => { const el = document.querySelectorAll(sel)[i]; const b = el.getBoundingClientRect();
  for (let gy = 1; gy < 10; gy++) for (let gx = 1; gx < 10; gx++) {
    const x = b.left + b.width * gx / 10, y = b.top + b.height * gy / 10;
    if (document.elementFromPoint(x, y) === el) return { x, y }; }
  return null; }"""

# a point on the first picture that is on no outline at all
BESIDE = """() => { const f = document.querySelector('.pin-frame'); const b = f.getBoundingClientRect();
  for (let gy = 1; gy < 20; gy++) for (let gx = 1; gx < 20; gx++) {
    const x = b.left + b.width * gx / 20, y = b.top + b.height * gy / 20; const hit = document.elementFromPoint(x, y);
    if (hit && !hit.classList.contains('pin-element') && f.contains(hit)) return { x, y }; }
  return null; }"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
        pg = await ctx.new_page(); logs = []; r = {}
        pg.on('console', lambda m: logs.append(m.text[:200]) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)[:300]))
        await pg.goto(URL); await pg.wait_for_timeout(2500)

        r['pins'] = await pg.locator('.pin-card').count()
        r['outlines_per_pin'] = await pg.evaluate("[...document.querySelectorAll('.pin-card')].map(c => c.querySelectorAll('.pin-element').length)")
        r['note'] = (await pg.locator('.board-note').inner_text()) if await pg.locator('.board-note').count() else None
        r['add_thumbs_still_there'] = await pg.locator('.pin__add').count()

        # keyboard: focus the sofa's outline in the first picture, Enter opens the card
        card1 = pg.locator('.pin-card').first
        sofa = card1.get_by_role('button', name='Sofa in this picture')
        r['sofa_buttons_by_name'] = await sofa.count()
        await sofa.first.focus(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
        r['card_open'] = await pg.locator('.pin-options').count()
        r['card_name'] = await pg.locator('.pin-options').get_attribute('aria-label')
        r['heading'] = await pg.locator('.pin-options h2').inner_text()
        r['sofa_options'] = await pg.evaluate("[...document.querySelectorAll('.pin-options__row')].map(row => row.querySelector('.pin-options__text').innerText.replace(/\\n/g, ' | '))")
        r['focus_on_first_add'] = await pg.evaluate("document.activeElement.getAttribute('aria-label')")
        r['expanded'] = await sofa.first.get_attribute('aria-expanded')
        await pg.screenshot(path=OUT + 'm41-card-sofa.png')
        box = await pg.locator('.pin-options').bounding_box()
        r['card_box'] = [round(v) for v in (box['x'], box['y'], box['width'], box['height'])]
        r['card_inside_window'] = box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= 1440 and box['y'] + box['height'] <= 900

        # Escape closes and the keyboard goes back to the outline
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        r['closed_by_escape'] = await pg.locator('.pin-options').count() == 0
        r['focus_back_on_outline'] = await pg.evaluate("document.activeElement.classList.contains('pin-element')")

        # pointer: a real click inside the rug's outline in the first picture
        index = await pg.evaluate("[...document.querySelectorAll('.pin-element')].findIndex(e => e.getAttribute('aria-label') === 'Rug in this picture')")
        spot = await pg.evaluate(INSIDE, ['.pin-element', index])
        r['rug_point_found'] = spot is not None
        await pg.mouse.click(spot['x'], spot['y']); await pg.wait_for_timeout(400)
        r['rug_heading'] = await pg.locator('.pin-options h2').inner_text()
        r['rug_options'] = await pg.evaluate("[...document.querySelectorAll('.pin-options__row strong')].map(e => e.innerText)")
        await pg.screenshot(path=OUT + 'm41-card-rug.png')

        # Add: the first choice goes into the room, the card closes, the toast says so
        await pg.locator('.pin-options__row button').first.click(); await pg.wait_for_timeout(1500)
        r['closed_after_add'] = await pg.locator('.pin-options').count() == 0
        r['toast'] = (await pg.locator('.toast').first.inner_text()).replace('\n', ' ') if await pg.locator('.toast').count() else None
        r['pieces_after_first_add'] = await pg.evaluate(COUNT)
        # The new piece is selected, so the piece panel takes the board's place (the app has
        # always done this after an add). Escape lets the piece go and the board comes back.
        r['board_hidden_while_piece_selected'] = await pg.locator('.pin-card').count() == 0
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        r['board_back'] = await pg.locator('.pin-card').count()

        # a second add, from another picture, by keyboard all the way: the count goes up by one
        other = pg.locator('.pin-card').nth(1).locator('.pin-element').first
        r['second_name'] = await other.get_attribute('aria-label')
        await other.focus(); await pg.keyboard.press(' '); await pg.wait_for_timeout(400)
        r['second_options'] = await pg.evaluate("[...document.querySelectorAll('.pin-options__row strong')].map(e => e.innerText)")
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)   # focus is on the first Add
        r['pieces_after_second_add'] = await pg.evaluate(COUNT)
        r['count_went_up'] = r['pieces_after_second_add'] == r['pieces_after_first_add'] + 1
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)   # let the new piece go again

        # a press outside closes
        await sofa.first.focus(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.locator('.board-header h1').click(); await pg.wait_for_timeout(300)
        r['closed_by_press_outside'] = await pg.locator('.pin-options').count() == 0

        # the picture beside the furniture still picks the pin
        spot = await pg.evaluate(BESIDE)
        await pg.mouse.click(spot['x'], spot['y']); await pg.wait_for_timeout(300)
        r['picked_after_press_beside'] = await pg.locator('.pin.is-picked').count()

        # search finds a picture by the furniture in it
        await pg.get_by_label('Search this board').fill('coffee table'); await pg.wait_for_timeout(300)
        r['pins_with_coffee_table'] = await pg.locator('.pin-card').count()

        r['console_errors'] = logs
        print(json.dumps(r, indent=1))
        await b.close()


async def safe():
    try:
        await main()
    except Exception as error:   # show which step failed without the long trace
        print('FAILED:', str(error)[:400])

asyncio.run(safe())
