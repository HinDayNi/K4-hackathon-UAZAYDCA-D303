const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching browser via msedge channel...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  const htmlPath = path.resolve(__dirname, 'demo-slides.html');
  const pdfPath = path.resolve(__dirname, 'demo-slides.pdf');

  console.log('Loading HTML file:', htmlPath);
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  // Count slides
  const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`Found ${slideCount} slides.`);

  // Generate PDF
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('PDF export completed successfully:', pdfPath);
  await browser.close();
})();
