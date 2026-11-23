# Connects a Pinterest board in the app, with Pinterest itself stood in for.
#
# The test machine cannot reach Pinterest, so two addresses are answered here:
#   widgets.pinterest.com  the board feed, with 49 pins in the same shape the real
#                          feed had on 23 Nov 2026 (three picture widths, a blank
#                          description, a description with a character code)
#   i.pinimg.com           every picture, as one small grey image
# Everything else is the app's own code: the dialog, the link check, the importer,
# the moodboard, the picks, keeping the board in the browser, and going back.
#
# Run it with the built app served on port 4173 (see README.md in this folder).
import asyncio, base64, json, sys
from playwright.async_api import async_playwright

BASE = 'http://localhost:4173'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
# a 2 by 2 grey PNG
GREY = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNsaGhgYGBgAAAEBAGBjBRMpAAAAABJRU5ErkJggg==')
SIZES = [(564, 1002), (564, 375), (560, 560), (480, 360), (500, 600), (320, 568), (564, 316)]
WORDS = ['Living room with a low sofa', ' ', 'We&#8217;ve painted the hall', 'Oak shelf &amp; a floor lamp', '']

def feed():
    pins = []
    for n in range(49):
        wide = SIZES[n % len(SIZES)]
        name = f'{n:02d}/aa/bb/picture{n}.jpg'
        pins.append({
            'id': str(424605071136961000 + n),
            'dominant_color': ['#aa9e96', '#3f4d0b', '#eae5ff', '#1a5f9f'][n % 4],
            'description': WORDS[n % len(WORDS)],
            'images': {
                '236x': {'width': 236, 'height': round(236 * wide[1] / wide[0]), 'url': f'https://i.pinimg.com/236x/{name}'},
                '237x': {'width': 236, 'height': round(236 * wide[1] / wide[0]), 'url': f'https://i.pinimg.com/236x/{name}'},
                '564x': {'width': wide[0], 'height': wide[1], 'url': f'https://i.pinimg.com/564x/{name}'},
            },
        })
    return {'data': {'board': {'name': 'Living room ideas', 'url': '/someone/living-room-ideas/', 'pin_count': 312}, 'user': {'full_name': 'Someone'}, 'pins': pins}}

async def main():
    r = {}; logs = []; asked = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        await pg.add_init_script("localStorage.setItem('apt-studio-welcomed','yes'); localStorage.setItem('apt-studio-toured','yes');")
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)[:200]))

        async def answer_feed(route):
            asked.append(route.request.url)
            if '/nobody/' in route.request.url:
                await route.fulfill(status=404, body='{}', content_type='application/json')
            else:
                await route.fulfill(status=200, body=json.dumps(feed()), content_type='application/json', headers={'access-control-allow-origin': '*'})
        await pg.route('https://widgets.pinterest.com/**', answer_feed)
        await pg.route('https://i.pinimg.com/**', lambda route: route.fulfill(status=200, body=GREY, content_type='image/png'))

        await pg.goto(BASE + '/'); await pg.wait_for_timeout(2500)
        async def problem():
            await pg.wait_for_timeout(700)
            found = pg.locator('.dialog .field__error')
            return (await found.inner_text()).strip() if await found.count() else ''

        # 1. Links that are not boards get a sentence of their own
        await pg.locator('.board-row__connect').click(); await pg.wait_for_timeout(400)
        r['field_has_focus'] = await pg.evaluate("document.activeElement.id") == 'board-link'
        for key, link in [('a_pin', 'https://www.pinterest.com/pin/12345/'), ('a_profile', 'pinterest.com/someone'), ('a_short_link', 'https://pin.it/abc'), ('not_a_link', 'hello')]:
            await pg.fill('#board-link', link); await pg.keyboard.press('Enter')
            r[key] = await problem()
        # 2. A board that does not exist
        await pg.fill('#board-link', 'pinterest.com/nobody/no-board'); await pg.keyboard.press('Enter')
        r['missing_board'] = await problem()
        # 3. A real-shaped board, pasted the way the Pinterest app shares it
        await pg.fill('#board-link', 'Look at this! https://www.pinterest.co.uk/someone/living-room-ideas/?invite_code=x1'); await pg.keyboard.press('Enter')
        await pg.wait_for_timeout(1500)
        r['asked_for'] = asked[-1]
        r['dialog_closed'] = await pg.locator('.dialog').count() == 0
        r['board_name'] = (await pg.locator('.board-row__name').inner_text()).strip()
        r['count_chip'] = ' '.join((await pg.locator('.board-row .tag').inner_text()).split())
        r['pins_shown'] = await pg.locator('.pin').count()
        # the pins sit in two columns, so each picture is found by its address, not its place
        r['first_picture'] = await pg.locator('.pin img[src*="picture0.jpg"]').get_attribute('src')
        r['blank_description_reads'] = await pg.locator('.pin img[src*="picture1.jpg"]').get_attribute('alt')
        r['code_in_description_reads'] = await pg.locator('.pin img[src*="picture2.jpg"]').get_attribute('alt')
        r['amp_in_description_reads'] = await pg.locator('.pin img[src*="picture3.jpg"]').get_attribute('alt')
        r['group_name'] = (await pg.locator('.strip-group').nth(1).inner_text()).strip()
        await pg.screenshot(path=f'{OUT}/pinterest-1-board.png')
        # 4. Pick two pins, reload: the board and the picks are still there
        await pg.locator('.pin').nth(0).click()
        await pg.locator('.pin').nth(3).click()
        await pg.wait_for_timeout(400)
        await pg.reload(); await pg.wait_for_timeout(2500)
        r['after_reload_name'] = (await pg.locator('.board-row__name').inner_text()).strip()
        r['after_reload_pins'] = await pg.locator('.pin').count()
        r['after_reload_picks'] = await pg.locator('.pin[aria-pressed="true"]').count()
        # 5. Back to the sample photos
        await pg.locator('.board-row__connect').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button', name='Back to the sample photos').click(); await pg.wait_for_timeout(600)
        r['back_to_samples'] = (await pg.locator('.board-row__name').inner_text()).strip()
        r['forgotten_in_browser'] = await pg.evaluate("localStorage.getItem('apt-studio-board')") is None
        r['errors'] = logs
        await b.close()
    print(json.dumps(r, indent=1))

asyncio.run(main())
