const puppeteer = require("puppeteer");

/**
 * Headless scraper for Thai company financial data from DBD DataWarehouse.
 * Bypasses overlays, handles client-side routing, and extracts the last 3 years
 * of total revenue and net profit.
 *
 * @param {string} companyName — Thai company name to search
 * @returns {Promise<Array<{year: number, revenue: number, netProfit: number}>>}
 */
async function scrapeCompany(companyName) {
  console.log(`[scraper] Starting headless scraper for: "${companyName}"`);

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  
  // Set User-Agent to look like a real browser to prevent cloudflare/bot blocks
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    // ─── 1. Determine Target URL ────────────────────────────────────
    let targetUrl;
    
    // Check if the input is a 13-digit Juristic ID
    const isJuristicId = /^\d{13}$/.test(companyName);
    
    if (isJuristicId) {
      // New DBD Datawarehouse+ format: 5th digit + Juristic ID
      const fifthDigit = companyName.charAt(4);
      targetUrl = `https://datawarehouse.dbd.go.th/company/profile/${fifthDigit}${companyName}`;
      console.log(`[scraper] Navigating directly to profile URL: ${targetUrl}`);
    } else {
      throw new Error(`กรุณาใช้เลขทะเบียนนิติบุคคล 13 หลักในการค้นหา (การค้นหาด้วยชื่อกำลังปรับปรุง)`);
    }

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    }).catch(e => console.log(`[scraper] Navigation warning: ${e.message}`));

    // Settle delay
    await delay(3000);

    // ─── 2. Handle modals & cookies overlays ────────────────────────
    console.log("[scraper] Accepting cookies if present...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const accept = btns.find(b => b.textContent.includes("ยอมรับ"));
      if (accept) accept.click();
    }).catch(() => {});
    await delay(1000);

    // ─── 3. Check if company profile loaded ─────────────────────────
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("Page not found") || pageText.includes("404")) {
      throw new Error(`ไม่พบข้อมูลสำหรับเลขทะเบียน "${companyName}" บน DBD DataWarehouse+`);
    }

    // ─── 4. Navigate to Financial Statements Tab ────────────────────
    console.log("[scraper] Clicking 'ข้อมูลงบการเงิน' tab...");
    const clickedFinData = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("a, button, li, span, div"));
      const tab = tabs.find(t => t.textContent.trim() === "ข้อมูลงบการเงิน" && t.offsetHeight > 0);
      if (tab) {
        tab.click();
        return true;
      }
      return false;
    });

    if (!clickedFinData) {
      throw new Error("ไม่พบเมนู 'ข้อมูลงบการเงิน' บนหน้ารายละเอียดบริษัท");
    }
    await delay(2500);

    // ─── 5. Switch to Income Statement (งบกำไรขาดทุน) view ──────────
    console.log("[scraper] Clicking 'งบกำไรขาดทุน'...");
    const switchedToIncome = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("a, button, label, span"));
      const btn = btns.find(b => b.textContent.trim() === "งบกำไรขาดทุน" && b.offsetHeight > 0);
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!switchedToIncome) {
      throw new Error("ไม่สามารถเปิดหน้าสัดส่วนงบกำไรขาดทุนได้");
    }
    await delay(3000); // Wait for the table data to load

    // ─── 6. Extract financial data from Income Statement table ──────
    console.log("[scraper] Extracting financial data...");
    const financialData = await page.evaluate(() => {
      const results = [];
      const table = document.querySelector("table");
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length === 0) return [];

      // Parse years from header row (Index 0)
      const headerRow = rows[0];
      const headerCells = Array.from(headerRow.querySelectorAll("th:not([rowspan]), td")).map(c => c.textContent.trim());

      // Find indices of years (e.g. 2566, 2567)
      const yearCols = [];
      headerCells.forEach((cell, idx) => {
        const match = cell.match(/(\d{4})/);
        if (match) {
          const year = parseInt(match[1]);
          // Buddhist Era (25xx) to CE (20xx) conversion
          const finalYear = year > 2400 ? year - 543 : year;
          yearCols.push({ colIndex: idx, year: finalYear });
        }
      });

      if (yearCols.length === 0) return [];

      // Find revenue and net profit rows
      let revenueRowCells = null;
      let netProfitRowCells = null;

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td, th"));
        if (cells.length === 0) continue;
        const text = cells[0].textContent.trim();

        if (text === "รายได้รวม") {
          revenueRowCells = cells.map(c => c.textContent.trim());
        }
        if (text === "กำไร(ขาดทุน) สุทธิ" || text === "กำไรสุทธิ") {
          netProfitRowCells = cells.map(c => c.textContent.trim());
        }
      }

      // Helper: parse numbers with commas, decimals, and negative parentheses
      function parseThaiNum(val) {
        if (!val || val === "-") return 0;
        let cleaned = val.replace(/,/g, "").replace(/\s/g, "").trim();
        let isNegative = false;
        if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
          isNegative = true;
          cleaned = cleaned.slice(1, -1);
        }
        if (cleaned.startsWith("-")) {
          isNegative = true;
          cleaned = cleaned.slice(1);
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : (isNegative ? -num : num);
      }

      // Extract values matching year indices
      // In the new table, year index j maps to column: 2 * j - 1 for "จำนวนเงิน" (Value)
      yearCols.forEach((yearCol) => {
        const valColIdx = 2 * yearCol.colIndex - 1;
        const revenue = revenueRowCells && valColIdx < revenueRowCells.length ? parseThaiNum(revenueRowCells[valColIdx]) : 0;
        const netProfit = netProfitRowCells && valColIdx < netProfitRowCells.length ? parseThaiNum(netProfitRowCells[valColIdx]) : 0;

        results.push({
          year: yearCol.year,
          revenue,
          netProfit,
        });
      });

      // Sort by year ascending
      return results.sort((a, b) => a.year - b.year);
    });

    console.log(`[scraper] Extraction completed. Data:`, JSON.stringify(financialData));
    
    // Take the last 3 years of financial data
    const last3Years = financialData.slice(-3);
    if (last3Years.length === 0) {
      throw new Error("ไม่สามารถสกัดข้อมูลจากตารางงบกำไรขาดทุนของบริษัทนี้ได้");
    }

    return last3Years;

  } catch (err) {
    console.error(`[scraper] Error occurred: ${err.message}`);
    throw err;
  } finally {
    await browser.close();
    console.log("[scraper] Headless browser closed.");
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { scrapeCompany };
