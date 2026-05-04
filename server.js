const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sites = [];
let leads = [];

// 🔍 wykrywanie technologii
function detectTech(html) {
  let tech = [];

  if (html.includes("wp-content")) tech.push("WordPress");
  if (html.includes("shopify")) tech.push("Shopify");
  if (html.includes("_next")) tech.push("Next.js");
  if (html.includes("react")) tech.push("React");

  if (tech.length === 0) tech.push("Custom");

  return tech;
}

// 🔥 AUDIT PRO++
app.post('/api/run-audit', async (req, res) => {
  const { url } = req.body;

  let seo = 100;
  let security = 100;
  let performance = 100;

  let issues = [];
  let alerts = [];

  try {
    const start = Date.now();

    const response = await fetch(url);
    const html = await response.text();

    const loadTime = Date.now() - start;
    const tech = detectTech(html);

    // SEO
    if (!html.includes("<title")) {
      seo -= 15;
      issues.push("Brak title");
      alerts.push("❗ Strona może nie pojawiać się poprawnie w Google");
    }

    if (!html.includes("meta name=\"description\"")) {
      seo -= 10;
      issues.push("Brak meta description");
      alerts.push("❗ Niska klikalność w wynikach Google");
    }

    if (!html.includes("<h1")) {
      seo -= 10;
      issues.push("Brak H1");
      alerts.push("❗ Struktura strony nieczytelna dla Google");
    }

    // SECURITY
    if (!url.startsWith("https")) {
      security -= 20;
      issues.push("Brak HTTPS");
      alerts.push("🚨 Strona nie jest bezpieczna dla użytkowników");
    }

    if (html.includes("wp-json")) {
      security -= 10;
      issues.push("Otwarty REST API");
      alerts.push("⚠️ Możliwe ujawnienie danych WordPress");
    }

    // PERFORMANCE
    if (loadTime > 2000) {
      performance -= 30;
      issues.push("Wolna strona");
      alerts.push("🚨 Użytkownicy mogą opuszczać stronę");
    } else if (loadTime > 1000) {
      performance -= 15;
      issues.push("Średnia prędkość");
      alerts.push("⚠️ Strona mogłaby działać szybciej");
    }

    const total = Math.max(0, Math.round((seo + security + performance) / 3));

    // alert spowolnienia
    const prev = sites.filter(s => s.url === url).slice(-1)[0];
    if (prev && loadTime > prev.loadTime + 500) {
      alerts.push("⚠️ Strona ostatnio wyraźnie zwolniła");
    }

    const result = {
      id: Date.now(),
      url,
      total,
      seo,
      security,
      performance,
      loadTime,
      tech,
      issues,
      alerts,
      date: new Date().toISOString()
    };

    sites.push(result);
    res.json(result);

  } catch {
    res.json({
      total: 0,
      issues: ["Strona niedostępna"],
      alerts: ["🚨 Strona nie odpowiada"]
    });
  }
});

// 📊 historia
app.get('/api/history', (req, res) => {
  const { url } = req.query;
  res.json(sites.filter(s => s.url === url));
});

// 💰 zapis leada
app.post('/api/lead', (req, res) => {
  const { email, url } = req.body;

  const lead = {
    id: Date.now(),
    email,
    url,
    date: new Date().toISOString()
  };

  leads.push(lead);
  res.json({ success: true });
});

// 📋 panel leadów
app.get('/api/leads', (req, res) => {
  res.json(leads.reverse());
});

// 🔐 odbiór danych z WordPress
app.post('/api/wp-data', (req, res) => {
  const data = req.body;

  console.log("📥 WP DATA:", data);

  // możesz to zapisać jako audit
  sites.push({
    id: Date.now(),
    url: data.site,
    total: 100,
    seo: 100,
    security: 80,
    performance: 80,
    tech: ["WordPress"],
    issues: data.issues || [],
    alerts: [],
    date: new Date().toISOString()
  });

  res.json({ success: true });
});

app.listen(process.env.PORT || 3000);

let wpData = [];

app.post('/api/wp-data', (req,res)=>{
  wpData.push(req.body);
  res.json({ok:true});
});

app.get('/api/wp-data', (req,res)=>{
  res.json(wpData.slice(-1)[0] || {});
});

const cors = require('cors');
app.use(cors());
app.use(express.json());

let wpData = [];

app.post('/api/wp-data', (req,res)=>{
  console.log("WP DATA:", req.body);
  wpData.push(req.body);
  res.json({ok:true});
});

app.get('/api/wp-data', (req,res)=>{
  res.json(wpData.slice(-1)[0] || {});
});
