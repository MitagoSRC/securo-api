const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let history = [];
let wpDataStore = {};

// 🔧 NORMALIZACJA URL (KLUCZOWE)
function normalizeUrl(url){
  if(!url) return "";

  return url
    .replace("http://","")
    .replace("https://","")
    .replace(/\/$/,"") // usuń końcowy /
    .toLowerCase();
}

// 🔍 AUDYT
app.post("/api/run-audit", async (req, res) => {

  const { url } = req.body;
  const cleanUrl = normalizeUrl(url);

  const loadTime = Math.floor(Math.random() * 2000) + 500;

  const data = {
    url: cleanUrl,
    total: 80 + Math.floor(Math.random() * 20),
    seo: 70 + Math.floor(Math.random() * 30),
    security: 70 + Math.floor(Math.random() * 30),
    performance: 60 + Math.floor(Math.random() * 40),
    loadTime,
    tech: ["HTML", "JS"],
    issues: [],
    date: new Date().toISOString()
  };

  history.push(data);

  res.json(data);
});

// 📊 HISTORIA
app.get("/api/history", (req, res) => {
  const cleanUrl = normalizeUrl(req.query.url);
  const filtered = history.filter(h => h.url === cleanUrl);
  res.json(filtered);
});

// 🔥 📥 WP DATA
app.post("/api/wp-data", (req, res) => {

  const data = req.body;

  console.log("📥 RAW WP:", data);

  if (!data || !data.site) {
    return res.json({ success: false });
  }

  const key = normalizeUrl(data.site);

  console.log("🔑 SAVED AS:", key);

  wpDataStore[key] = {
    ...data,
    updated: new Date().toISOString()
  };

  res.json({ success: true });
});

// 🔥 📤 WP DATA GET
app.get("/api/wp-data", (req, res) => {

  const key = normalizeUrl(req.query.url);

  console.log("🔍 LOOKING FOR:", key);

  if (key && wpDataStore[key]) {
    return res.json(wpDataStore[key]);
  }

  const last = Object.values(wpDataStore).slice(-1)[0];

  res.json(last || {});
});

app.listen(3000, () => {
  console.log("Server działa na porcie 3000");
});
