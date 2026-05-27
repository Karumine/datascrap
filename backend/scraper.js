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
    // ─── 1. Navigate directly to search results page ────────────────
    const searchUrl = `https://datawarehouse.dbd.go.th/juristic/searchInfo?keyword=${encodeURIComponent(companyName)}`;
    console.log(`[scraper] Navigating directly to search URL: ${searchUrl}`);
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }).catch(e => console.log(`[scraper] Navigation warning: ${e.message}`));

    // Settle delay
    await delay(4000);

    // ─── 2. Handle modals & cookies overlays ────────────────────────
    console.log("[scraper] Closing warning modal if present...");
    await page.click("#btnWarning").catch(() => {});
    await delay(500);

    console.log("[scraper] Accepting cookies if present...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll(".cc-btn"));
      const accept = btns.find(b => b.textContent.includes("ยอมรับทั้งหมด"));
      if (accept) accept.click();
    }).catch(() => {});
    await delay(2000); // Wait for animations to complete

    // ─── 3. Click the first company row in search results ────────────
    console.log("[scraper] Waiting for search result table row...");
    const rowSelector = "table tr.cursor-pointer";
    try {
      await page.waitForSelector(rowSelector, { timeout: 20000 });
    } catch (e) {
      throw new Error(`ไม่พบรายชื่อบริษัทสำหรับ "${companyName}" บน DBD DataWarehouse`);
    }

    console.log("[scraper] Clicking the first company result row...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {}),
      page.click(rowSelector)
    ]);
    await delay(4000);

    // ─── 4. Navigate to Financial Statements Tab ────────────────────
    console.log("[scraper] Waiting for profile page navigation tab (#menu2)...");
    await page.waitForSelector("#menu2", { timeout: 20000 });

    console.log("[scraper] Opening 'ข้อมูลงบการเงิน' dropdown...");
    await page.click("#menu2");
    await delay(1500);

    console.log("[scraper] Selecting 'งบการเงิน' subtab...");
    const selectedSubtab = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("ul.dropdown-menu a, .dropdown-menu a"));
      const target = anchors.find(a => a.textContent.trim() === "งบการเงิน");
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    if (!selectedSubtab) {
      throw new Error("ไม่พบเมนูงบการเงิน บนหน้ารายละเอียดบริษัท");
    }
    await delay(4000);

    // ─── 5. Switch to Income Statement (งบกำไรขาดทุน) view ──────────
    console.log("[scraper] Clicking 'งบกำไรขาดทุน'...");
    const switchedToIncome = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("div, a, button, li, span"));
      const target = items.find(x => x.textContent.trim() === "งบกำไรขาดทุน" && x.offsetWidth > 0);
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    if (!switchedToIncome) {
      throw new Error("ไม่สามารถเปิดหน้าสัดส่วนงบกำไรขาดทุนได้");
    }
    await delay(5000); // Wait for the table data to load via AJAX

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
      const headerCells = Array.from(headerRow.querySelectorAll("th, td")).map(c => c.textContent.trim());

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
      // Year index j maps to columns:
      // Value: cellIndex = 2 * j - 1
      yearCols.forEach((yearCol) => {
        const valColIdx = 2 * yearCol.colIndex - 1;
        const revenue = revenueRowCells ? parseThaiNum(revenueRowCells[valColIdx]) : 0;
        const netProfit = netProfitRowCells ? parseThaiNum(netProfitRowCells[valColIdx]) : 0;

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
