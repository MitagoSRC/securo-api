const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Pamięć (na start — później można dać DB)
let history = [];
let wpDataStore = {};

// 🔧 NORMALIZACJA URL (klucz do działania WP)
function normalizeUrl(url) {
  if (!url) return "";

  return url
    .replace("http://", "")
    .replace("https://", "")
    .replace(/\/$/, "")
    .toLowerCase();
}

// =======================
// 🔍 AUDYT STRONY
// =======================
app.post("/api/run-audit", async (req, res) => {
  try {
    const { url } = req.body;

    const cleanUrl = normalizeUrl(url);

    // 🔥 symulacja (tu możesz później podpiąć realny crawler)
    const loadTime = Math.floor(Math.random() * 1500) + 500;

    const seo = 70 + Math.floor(Math.random() * 30);
    const security = 75 + Math.floor(Math.random() * 25);
    const performance = 60 + Math.floor(Math.random() * 40);

    const issues = [];

    if (seo < 85) issues.push("Brak meta description");
    if (performance < 70) issues.push("Strona wolno się ładuje");
    if (security < 80) issues.push("Otwarty REST API");

    const data = {
      url: cleanUrl,
      total: Math.round((seo + security + performance) / 3),
      seo,
      security,
      performance,
      loadTime,
      tech: ["HTML", "JavaScript"],
      issues,
      date: new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "audit error" });
  }
});

// =======================
// 📊 HISTORIA
// =======================
app.get("/api/history", (req, res) => {
  const cleanUrl = normalizeUrl(req.query.url);
  const filtered = history.filter(h => h.url === cleanUrl);
  res.json(filtered);
});

// =======================
// 📥 WORDPRESS (ZAPIS)
// =======================
app.post("/api/wp-data", (req, res) => {
  try {
    const data = req.body;

    console.log("📥 WP DATA:", data);

    if (!data || !data.site) {
      return res.json({ success: false });
    }

    const key = normalizeUrl(data.site);

    wpDataStore[key] = {
      ...data,
      updated: new Date().toISOString()
    };

    console.log("✅ SAVED FOR:", key);

    res.json({ success: true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "wp save error" });
  }
});

// =======================
// 📤 WORDPRESS (POBIERANIE)
// =======================
app.get("/api/wp-data", (req, res) => {
  try {
    const key = normalizeUrl(req.query.url);

    console.log("🔍 GET WP FOR:", key);

    if (key && wpDataStore[key]) {
      return res.json(wpDataStore[key]);
    }

    const last = Object.values(wpDataStore).slice(-1)[0];

    res.json(last || {});

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "wp read error" });
  }
});

// =======================
// 🚀 START SERWERA
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Securo API działa na porcie", PORT);
});
