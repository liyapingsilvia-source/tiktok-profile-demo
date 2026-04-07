import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const screenId = process.argv[2] || 'screen1';
const plan = process.argv[3] || 'A';
const outFile = process.argv[4] || `screen-${screenId}.html`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/tiktok-login.html', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(({ screenId, plan }) => {
    if (plan === 'B' && typeof window.switchPlan === 'function') window.switchPlan('B');
    document.querySelectorAll('.screen').forEach(s => {
      s.style.transition = 'none';
      if (s.id === screenId) {
        s.classList.remove('hidden-right', 'hidden-left');
        s.classList.add('active');
      } else {
        s.remove();
      }
    });
    if (screenId === 'screen6' && typeof window.applyS6Plan === 'function') window.applyS6Plan();
    document.getElementById('flowMode')?.remove();
    document.querySelector('.mode-switch')?.remove();
    document.getElementById('addPhoneOverlay')?.remove();
    document.getElementById('switchAccountPanel')?.remove();
    document.getElementById('addAccountPanel')?.remove();
    // Remove all script tags
    document.querySelectorAll('script').forEach(s => s.remove());
  }, { screenId, plan });

  await page.waitForTimeout(300);

  // Get the full rendered HTML with computed styles inlined
  const html = await page.evaluate(() => {
    function getInlineStyles(el) {
      const cs = window.getComputedStyle(el);
      const defaults = window.getComputedStyle(document.createElement(el.tagName));
      let style = '';
      for (let i = 0; i < cs.length; i++) {
        const prop = cs[i];
        const val = cs.getPropertyValue(prop);
        const def = defaults.getPropertyValue(prop);
        if (val !== def) {
          style += `${prop}:${val};`;
        }
      }
      return style;
    }

    function processElement(el) {
      if (el.nodeType === 3) return; // text node
      if (el.nodeType !== 1) return;
      
      const inlineStyle = getInlineStyles(el);
      if (inlineStyle) el.setAttribute('style', inlineStyle);
      
      for (const child of el.children) {
        processElement(child);
      }
    }

    const screen = document.querySelector('.screen.active');
    if (!screen) return '<html><body>No screen found</body></html>';
    
    // Clone the screen to avoid modifying the live DOM
    const clone = screen.cloneNode(true);
    
    // Create a temporary container to inline styles
    const temp = document.createElement('div');
    temp.appendChild(clone);
    document.body.appendChild(temp);
    processElement(clone);
    document.body.removeChild(temp);
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 390px; height: 844px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;
  });

  writeFileSync(outFile, html);
  console.log(`Extracted ${screenId} to ${outFile} (${html.length} bytes)`);
  
  await browser.close();
})();
