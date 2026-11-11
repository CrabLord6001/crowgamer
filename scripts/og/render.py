"""Renders scripts/og/template.html to public/og.png at 1200x630."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/og/template.html"
OUT = ROOT / "public/og.png"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1200, "height": 630})
        await pg.goto(SRC.as_uri(), wait_until="networkidle")
        await pg.wait_for_timeout(1200)   # webfonts
        OUT.parent.mkdir(parents=True, exist_ok=True)
        await pg.screenshot(path=str(OUT))
        await b.close()
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} kB)")

asyncio.run(main())
