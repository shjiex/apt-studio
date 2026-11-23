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
        # prices: add a sofa and a lamp, give each a price, one a link
        for name, price, link in [('Sofa', '649', 'https://www.ikea.com/us/en/p/sofa'), ('Floor lamp', '39.99', '')]:
            await pg.locator('.strip-area .strip-search input').fill(name); await pg.wait_for_timeout(200)
            await pg.locator('.tile').first.click(); await pg.wait_for_timeout(500)
            await pg.get_by_role('button', name='Add link or price').click()
            if link: await pg.get_by_label('Product page link').fill(link)
            await pg.get_by_label('Price in dollars').fill(price)
            await pg.get_by_role('button', name='Save').click(); await pg.wait_for_timeout(400)
            if name == 'Sofa': await pg.screenshot(path=OUT+'price-panel.png')
            await pg.keyboard.press('Escape')
        await pg.locator('.strip-area .strip-search input').fill('')
        await pg.get_by_role('button', name='Shop list').click(); await pg.wait_for_timeout(600)
        r['total'] = (await pg.locator('.shop-total').inner_text()).replace('\n', ' ')
        r['rows'] = await pg.locator('.shop-row').count()
        await pg.screenshot(path=OUT+'price-list.png')
        await pg.get_by_role('button', name='Done').click()
        # inside: the hint, then click the floor to stand there
        await pg.get_by_role('tab', name='Inside').click(); await pg.wait_for_timeout(3000)
        r['hint'] = await pg.locator('.stage__passes').inner_text()
        await pg.screenshot(path=OUT+'stand-0.png')
        await pg.mouse.click(430, 600); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'stand-1.png')
        await pg.get_by_role('button', name='Realistic').click(); await pg.wait_for_timeout(1500)
        r['real_controls'] = [await pg.locator('.stage__bright').count(), await pg.get_by_role('button', name='Save picture').count()]
        r['errors']=logs[:6]; print(json.dumps(r, indent=1)); await b.close()
asyncio.run(main())
