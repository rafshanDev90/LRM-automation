import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
page.on('response', r => { if (r.url().includes('/api/')) console.log('API:', r.status(), r.url()); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

// Upload code file to the first task
const [codeInput] = await page.$$('input.code-file');
await codeInput.uploadFile('/tmp/opencode/lrmtest/small.js');

// Wait for preview button to enable
await page.waitForFunction(() => !document.getElementById('previewBtn').disabled, { timeout: 5000 });

// Click preview
await page.click('#previewBtn');
await page.waitForSelector('.modal-overlay.open', { timeout: 15000 });
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/opencode/modal.png' });
console.log('MODAL screenshot taken');

// Check iframe state
const frameInfo = await page.evaluate(() => {
  const f = document.getElementById('previewFrame');
  const r = f.getBoundingClientRect();
  const modal = document.querySelector('.modal').getBoundingClientRect();
  return { iframe: { w: r.width, h: r.height }, modal: { w: modal.width, h: modal.height } };
});
console.log('SIZES:', JSON.stringify(frameInfo));

// Click Download PDF
await page.click('#downloadBtn');
try {
  await page.waitForFunction(() => !document.getElementById('downloadBtn').disabled === false, { timeout: 20000 });
} catch {}
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/opencode/after-download.png' });

const toastText = await page.evaluate(() => document.getElementById('toast').textContent);
console.log('TOAST:', toastText);

await browser.close();
console.log('DONE');
