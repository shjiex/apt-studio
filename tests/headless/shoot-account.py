# Signs up, logs out, logs in wrongly, asks for a reset link and logs in, against the
# Firebase Auth emulator. Nothing here touches the real Firebase project.
#
# Before running it:
#   1. put stand-in values in src/firebaseConfig.js (projectId 'demo-apt-studio')
#   2. VITE_EMULATOR=1 npx vite build --outDir ../dist-emu, then serve that folder on port 4174
#   3. npx firebase emulators:start --only auth --project demo-apt-studio
# Firestore is not emulated here, so the account menu is expected to say that the
# account could not be reached. That is the failure path, and this script checks it.
import asyncio, json, sys, time
from playwright.async_api import async_playwright

BASE = 'http://localhost:4174'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'

async def main():
    r = {}; logs = []
    email = f'tester{int(time.time())}@example.com'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        await pg.add_init_script("localStorage.setItem('apt-studio-welcomed','yes'); localStorage.setItem('apt-studio-toured','yes');")
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)[:200]))

        async def error_text():
            await pg.wait_for_timeout(600)
            found = pg.locator('.field__error')
            return (await found.inner_text()).strip() if await found.count() else ''

        # 1. Sign up: the plain mistakes are caught on the card
        await pg.goto(BASE + '/signup'); await pg.wait_for_timeout(1500)
        r['signup_button_on'] = await pg.get_by_role('button', name='Create account').is_enabled()
        await pg.get_by_role('button', name='Create account').click()
        r['empty_email'] = await error_text()
        await pg.fill('#email', email); await pg.fill('#password', 'abc')
        await pg.get_by_role('button', name='Create account').click()
        r['short_password'] = await error_text()
        await pg.screenshot(path=f'{OUT}/account-1-signup.png')
        # the eye shows the password
        await pg.get_by_role('button', name='Show the password').click()
        r['password_shown'] = await pg.get_attribute('#password', 'type') == 'text'
        await pg.fill('#password', 'secret12')
        await pg.get_by_role('button', name='Create account').click()
        await pg.wait_for_timeout(2500)
        r['signed_up_lands_on_room'] = pg.url.rstrip('/') == BASE
        account = pg.get_by_role('button', name='Account')
        r['initial_on_button'] = (await account.first.inner_text()).strip()[:1] if await account.count() else ''

        # 2. The account menu says how saving is going (Firestore is off here, so: not reached)
        await pg.wait_for_timeout(6000)
        await pg.locator('.account > button').click(); await pg.wait_for_timeout(400)
        r['menu_email'] = (await pg.locator('.account__email').inner_text()).strip() == email
        r['menu_note'] = (await pg.locator('.account__note').inner_text()).strip()
        r['try_again_offered'] = await pg.get_by_role('button', name='Try again').count() == 1
        await pg.screenshot(path=f'{OUT}/account-2-menu.png')
        # a signed-in person who opens the login page is sent back to the room
        await pg.goto(BASE + '/login'); await pg.wait_for_timeout(2500)
        r['login_page_sends_back'] = pg.url.rstrip('/') == BASE

        # 3. Log out
        await pg.locator('.account > button').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Log out').click(); await pg.wait_for_timeout(1500)
        r['logged_out'] = await pg.get_by_role('link', name='Log in').count() == 1

        # 4. Log in with the wrong password, then ask for a reset link
        await pg.goto(BASE + '/login'); await pg.wait_for_timeout(1200)
        await pg.fill('#email', email); await pg.fill('#password', 'wrong-one')
        await pg.get_by_role('button', name='Log in').click()
        await pg.wait_for_timeout(1500)
        r['wrong_password'] = await error_text()
        r['reset_offered'] = await pg.get_by_role('button', name='Email me a reset link').count() == 1
        await pg.screenshot(path=f'{OUT}/account-3-wrong.png')
        await pg.get_by_role('button', name='Email me a reset link').click(); await pg.wait_for_timeout(1500)
        note = pg.locator('.auth__notice')
        r['reset_note'] = (await note.inner_text()).strip() if await note.count() else ''

        # 5. Log in with the right one
        await pg.fill('#password', 'secret12')
        await pg.get_by_role('button', name='Log in').click(); await pg.wait_for_timeout(2500)
        r['logged_in_lands_on_room'] = pg.url.rstrip('/') == BASE
        # 6. A reload keeps the person signed in
        await pg.reload(); await pg.wait_for_timeout(3000)
        r['still_signed_in_after_reload'] = await pg.locator('.account > button').count() == 1
        # 7. A second sign-up with the same email is refused in words
        await pg.locator('.account > button').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Log out').click(); await pg.wait_for_timeout(1200)
        await pg.goto(BASE + '/signup'); await pg.wait_for_timeout(1200)
        await pg.fill('#email', email); await pg.fill('#password', 'secret12')
        await pg.get_by_role('button', name='Create account').click(); await pg.wait_for_timeout(1500)
        r['email_taken'] = await error_text()
        r['errors'] = logs
        await b.close()
    print(json.dumps(r, indent=1))

asyncio.run(main())
