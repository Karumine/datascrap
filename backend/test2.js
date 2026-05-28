const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://datawarehouse.dbd.go.th/company/profile/50215557006921', {waitUntil: 'networkidle2'});
  
  // Click ข้อมูลงบการเงิน
  console.log('Clicking ข้อมูลงบการเงิน...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('a, button, li, span, div'));
    const tab = tabs.find(t => t.textContent.trim() === 'ข้อมูลงบการเงิน' && t.offsetHeight > 0);
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click งบกำไรขาดทุน
  console.log('Clicking งบกำไรขาดทุน...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('a, button, label, span'));
    const btn = btns.find(b => b.textContent.trim() === 'งบกำไรขาดทุน' && b.offsetHeight > 0);
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Scrape table
  console.log('Scraping table...');
  const tableData = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return null;
    return table.innerText;
  });
  console.log('Table Data:', tableData ? tableData.substring(0, 1000) : 'No table found');
  
  await browser.close();
})();
