import { chromium } from 'playwright';

const captureId = process.argv[2];
const screenId = process.argv[3] || 'screen1';
const plan = process.argv[4] || 'A';

if (!captureId) {
  console.error('Usage: node capture-screen.mjs <captureId> [screenId] [plan]');
  process.exit(1);
}

const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  console.log('[1] Navigating...');
  await page.goto('http://localhost:3000/tiktok-login.html', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(800);

  console.log('[2] Switching to screen:', screenId, 'plan:', plan);
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

    // Also remove flow mode, mode switches, and other non-visible elements
    const flowMode = document.getElementById('flowMode');
    if (flowMode) flowMode.remove();
    const modeSwitch = document.querySelector('.mode-switch');
    if (modeSwitch) modeSwitch.remove();
    const addPhone = document.getElementById('addPhoneOverlay');
    if (addPhone && screenId !== 'addPhoneScreen') addPhone.remove();
    const switchPanel = document.getElementById('switchAccountPanel');
    if (switchPanel) switchPanel.remove();
    const addAccPanel = document.getElementById('addAccountPanel');
    if (addAccPanel) addAccPanel.remove();
  }, { screenId, plan });

  await page.waitForTimeout(300);

  console.log('[3] Injecting capture script...');
  const scriptResp = await context.request.get('https://mcp.figma.com/mcp/html-to-design/capture.js');
  await page.evaluate((s) => {
    const el = document.createElement('script');
    el.textContent = s;
    document.head.appendChild(el);
  }, await scriptResp.text());

  await page.waitForTimeout(2000);

  const hasFigma = await page.evaluate(() => typeof window.figma !== 'undefined' && typeof window.figma.captureForDesign === 'function');
  console.log('[4] Figma API ready:', hasFigma);

  if (!hasFigma) {
    console.error('Figma capture API not available');
    await browser.close();
    process.exit(1);
  }

  console.log('[5] Capturing...');
  const capturePromise = page.evaluate(({ captureId, endpoint }) => {
    return window.figma.captureForDesign({ captureId, endpoint, selector: '.screen.active' });
  }, { captureId, endpoint });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 20000)
  );

  try {
    const result = await Promise.race([capturePromise, timeoutPromise]);
    console.log('[6] Done:', JSON.stringify(result));
  } catch (e) {
    console.log('[6] Timed out (data may still be uploading)');
  }

  await page.waitForTimeout(5000);
  await browser.close();
  console.log('[7] Browser closed');
})();
