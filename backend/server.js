const express = require("express");
const cors = require("cors");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { scrapeCompany } = require("./scraper");
const multer = require("multer");
const xlsx = require("xlsx");

// ─── Database Setup ────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "finance.db");
let db;

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS financials (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name  TEXT    NOT NULL,
      year          INTEGER NOT NULL,
      revenue       REAL,
      net_profit    REAL,
      scraped_at    TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(company_name, year)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS search_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name  TEXT    NOT NULL,
      searched_at   TEXT    DEFAULT (datetime('now','localtime')),
      source        TEXT    NOT NULL DEFAULT 'scraped',
      result_count  INTEGER DEFAULT 0,
      revenue_latest REAL,
      net_profit_latest REAL
    );
  `);

  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Express App ───────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;
const upload = multer({ storage: multer.memoryStorage() });

// ─── GET /api/template ──────────────────────────────────────────────
app.get("/api/template", (req, res) => {
  const wsData = [
    ["ชื่อบริษัท", "รายการ", "2564", "2565", "2566"],
    ["บริษัท เอ จำกัด", "รายได้รวม", 1000000, 1200000, 1500000],
    ["บริษัท เอ จำกัด", "กำไรสุทธิ", 200000, 300000, 450000],
    ["บริษัท บี จำกัด", "รายได้รวม", 2000000, 2200000, 2500000],
    ["บริษัท บี จำกัด", "กำไรสุทธิ", 500000, 600000, 850000]
  ];
  
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Template");
  
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  
  res.setHeader('Content-Disposition', 'attachment; filename="template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ─── POST /api/upload-excel ─────────────────────────────────────────
app.post("/api/upload-excel", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  }

  try {
    const wb = xlsx.read(req.file.buffer, { type: "buffer" });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    
    // Parse as JSON array of arrays
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    if (data.length < 2) {
      return res.status(400).json({ error: "ไม่พบข้อมูลในไฟล์ Excel หรือรูปแบบไม่ถูกต้อง" });
    }

    const headerRow = data[0];
    const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
    
    if (rows.length === 0) {
      return res.status(400).json({ error: "ไม่พบข้อมูลในไฟล์ Excel หรือรูปแบบไม่ถูกต้อง" });
    }
    
    // Find year columns from header
    const yearCols = [];
    for (let i = 2; i < headerRow.length; i++) {
      const colName = String(headerRow[i] || "").trim();
      const match = colName.match(/(\d{4})/);
      if (match) {
        yearCols.push({ index: i, year: parseInt(match[1]) });
      }
    }

    if (yearCols.length === 0) {
      return res.status(400).json({ error: "ไม่พบคอลัมน์ที่เป็นปี (เช่น 2564, 2565) ในแถวแรกสุดของไฟล์" });
    }

    // Group by company name
    const companiesRaw = {};
    for (const row of rows) {
      const cName = String(row[0] || "").trim();
      const metric = String(row[1] || "").trim();
      
      if (!cName) continue;
      if (!companiesRaw[cName]) {
        companiesRaw[cName] = {};
        for (const yc of yearCols) {
          companiesRaw[cName][yc.year] = { year: yc.year, revenue: 0, netProfit: 0 };
        }
      }

      const isRevenue = metric === "รายได้รวม" || metric.includes("รายได้");
      const isNetProfit = metric === "กำไรสุทธิ" || metric.includes("กำไร");

      for (const yc of yearCols) {
        // Remove commas and spaces before parsing
        const cleanedStr = String(row[yc.index] || "0").replace(/,/g, "").trim();
        const val = parseFloat(cleanedStr) || 0;
        
        if (isRevenue) {
          companiesRaw[cName][yc.year].revenue = val;
        } else if (isNetProfit) {
          companiesRaw[cName][yc.year].netProfit = val;
        }
      }
    }

    const results = [];

    // Process and save to SQLite
    for (const [companyName, yearsData] of Object.entries(companiesRaw)) {
      const financialData = Object.values(yearsData).sort((a, b) => a.year - b.year);
      
      for (const row of financialData) {
        db.run(
          `INSERT OR REPLACE INTO financials (company_name, year, revenue, net_profit) VALUES (?, ?, ?, ?)`,
          [companyName, row.year, row.revenue, row.netProfit]
        );
      }
      
      const latest = financialData[financialData.length - 1] || { revenue: 0, netProfit: 0 };
      db.run(
        `INSERT INTO search_history (company_name, source, result_count, revenue_latest, net_profit_latest) VALUES (?, ?, ?, ?, ?)`,
        [companyName, "excel", financialData.length, latest.revenue, latest.netProfit]
      );
      
      results.push({
        companyName,
        source: "excel",
        data: financialData,
      });
    }
    
    saveDB();

    res.json({
      results
    });

  } catch (err) {
    console.error("[excel upload error]", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอ่านไฟล์ Excel" });
  }
});

// ─── GET /api/search?name=<company> ────────────────────────────────
app.get("/api/search", async (req, res) => {
  const companyName = (req.query.name || "").toString().trim();

  if (!companyName) {
    return res.status(400).json({ error: "กรุณาระบุชื่อบริษัท" });
  }

  try {
    // 1. Check SQLite cache
    const stmt = db.prepare("SELECT year, revenue, net_profit FROM financials WHERE company_name = ? ORDER BY year ASC");
    stmt.bind([companyName]);

    const cached = [];
    while (stmt.step()) {
      cached.push(stmt.getAsObject());
    }
    stmt.free();

    if (cached.length > 0) {
      console.log(`[cache hit] ${companyName} — ${cached.length} rows`);

      const resultData = cached.map((r) => ({
        year: r.year,
        revenue: r.revenue,
        netProfit: r.net_profit,
      }));

      // Log to search_history (deduplicate: skip if same company searched within 60s)
      const latest = resultData[resultData.length - 1];
      const recentCheck = db.prepare(
        `SELECT id FROM search_history WHERE company_name = ? AND searched_at > datetime('now','localtime','-60 seconds') LIMIT 1`
      );
      recentCheck.bind([companyName]);
      const hasRecent = recentCheck.step();
      recentCheck.free();

      if (!hasRecent) {
        db.run(
          `INSERT INTO search_history (company_name, source, result_count, revenue_latest, net_profit_latest) VALUES (?, ?, ?, ?, ?)`,
          [companyName, "cache", resultData.length, latest.revenue, latest.netProfit]
        );
        saveDB();
      }

      return res.json({
        companyName,
        source: "cache",
        data: resultData,
      });
    }

    // 2. Cache miss — launch Puppeteer scraper
    console.log(`[cache miss] ${companyName} — launching scraper…`);
    const scraped = await scrapeCompany(companyName);

    if (!scraped || scraped.length === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลงบการเงินของบริษัทนี้" });
    }

    // 3. Save to SQLite
    for (const row of scraped) {
      db.run(
        `INSERT OR REPLACE INTO financials (company_name, year, revenue, net_profit) VALUES (?, ?, ?, ?)`,
        [companyName, row.year, row.revenue, row.netProfit]
      );
    }

    // 4. Log to search_history (deduplicate: skip if same company searched within 60s)
    const latest = scraped[scraped.length - 1];
    const recentCheck2 = db.prepare(
      `SELECT id FROM search_history WHERE company_name = ? AND searched_at > datetime('now','localtime','-60 seconds') LIMIT 1`
    );
    recentCheck2.bind([companyName]);
    const hasRecent2 = recentCheck2.step();
    recentCheck2.free();

    if (!hasRecent2) {
      db.run(
        `INSERT INTO search_history (company_name, source, result_count, revenue_latest, net_profit_latest) VALUES (?, ?, ?, ?, ?)`,
        [companyName, "scraped", scraped.length, latest.revenue, latest.netProfit]
      );
    }
    saveDB();

    console.log(`[saved] ${companyName} — ${scraped.length} rows`);
    return res.json({
      companyName,
      source: "scraped",
      data: scraped,
    });
  } catch (err) {
    console.error("[error]", err);
    return res.status(500).json({ error: `เกิดข้อผิดพลาด: ${err.message}` });
  }
});

// ─── GET /api/history — search history (deduplicated by company) ───
app.get("/api/history", (_req, res) => {
  const stmt = db.prepare(
    `SELECT h.id, h.company_name, h.searched_at, h.source, h.result_count, h.revenue_latest, h.net_profit_latest
     FROM search_history h
     INNER JOIN (
       SELECT company_name, MAX(searched_at) as max_at
       FROM search_history GROUP BY company_name
     ) latest ON h.company_name = latest.company_name AND h.searched_at = latest.max_at
     ORDER BY h.searched_at DESC LIMIT 30`
  );

  const history = [];
  while (stmt.step()) {
    history.push(stmt.getAsObject());
  }
  stmt.free();

  res.json(history);
});

// ─── DELETE /api/history/:id — remove a history entry ──────────────
app.delete("/api/history/:id", (req, res) => {
  db.run("DELETE FROM search_history WHERE id = ?", [req.params.id]);
  saveDB();
  res.json({ deleted: true });
});

// ─── GET /api/companies — list cached companies ───────────────────
app.get("/api/companies", (_req, res) => {
  const stmt = db.prepare(
    `SELECT company_name, COUNT(*) as years, MAX(scraped_at) as last_scraped
     FROM financials GROUP BY company_name ORDER BY last_scraped DESC`
  );

  const companies = [];
  while (stmt.step()) {
    companies.push(stmt.getAsObject());
  }
  stmt.free();

  res.json(companies);
});

// ─── DELETE /api/companies/:name — remove cached data ──────────────
app.delete("/api/companies/:name", (req, res) => {
  db.run("DELETE FROM financials WHERE company_name = ?", [req.params.name]);
  saveDB();
  res.json({ deleted: true });
});

// ─── Start Server ──────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀  Backend API running → http://localhost:${PORT}`);
    console.log(`📂  Database: ${DB_PATH}`);
  });
});
