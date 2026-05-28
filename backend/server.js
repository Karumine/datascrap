const express = require("express");
const cors = require("cors");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { scrapeCompany } = require("./scraper");

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
