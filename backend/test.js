const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://datawarehouse.dbd.go.th', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 2000));
  await page.type('input[placeholder*="ค้นหาด้วยชื่อหรือเลขทะเบียนนิติบุคคล"]', '0215557006921');
  await new Promise(r => setTimeout(r, 2000));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  console.log('URL after search:', page.url());
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Text:', text.substring(0, 300));
  await browser.close();
})();
