const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let history = [];
let wpDataStore = {};

// 🔍 FAKE AUDIT (Twój istniejący może być bardziej rozbudowany)
app.post("/api/run-audit", async (req, res) => {

  const { url } = req.body;

  const loadTime = Math.floor(Math.random() * 2000) + 500;

  const data = {
    url,
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
  const { url } = req.query;
  const filtered = history.filter(h => h.url === url);
  res.json(filtered);
});

// 🔥 📥 ZAPIS WP
app.post("/api/wp-data", (req, res) => {

  const data = req.body;

  console.log("📥 WP DATA:", data);

  if (!data || !data.site) {
    return res.json({ success: false });
  }

  wpDataStore[data.site] = {
    ...data,
    updated: new Date().toISOString()
  };

  res.json({ success: true });
});

// 🔥 📤 POBIERANIE WP
app.get("/api/wp-data", (req, res) => {

  const url = req.query.url;

  if (url && wpDataStore[url]) {
    return res.json(wpDataStore[url]);
  }

  const last = Object.values(wpDataStore).slice(-1)[0];

  res.json(last || {});
});

app.listen(3000, () => {
  console.log("Server działa na porcie 3000");
});
