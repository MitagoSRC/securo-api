const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sites = [];

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
    const sizeKB = Math.round(html.length / 1024);

    const tech = detectTech(html);

    // SEO
    if (!html.includes("<title")) { seo -= 15; issues.push("Brak title"); }
    if (!html.includes("meta name=\"description\"")) { seo -= 10; issues.push("Brak meta description"); }
    if (!html.includes("<h1")) { seo -= 10; issues.push("Brak H1"); }

    // SECURITY
    if (!url.startsWith("https")) { security -= 20; issues.push("Brak HTTPS"); }
    if (html.includes("wp-json")) { security -= 10; issues.push("Otwarty REST API"); }

    // 🔥 PERFORMANCE (bardziej realistyczne)
    if (loadTime > 2000) {
      performance -= 30;
      issues.push("Bardzo wolna odpowiedź serwera");
    } else if (loadTime > 1000) {
      performance -= 15;
      issues.push("Średni czas odpowiedzi");
    }

    if (sizeKB > 500) {
      performance -= 20;
      issues.push("Strona bardzo ciężka (" + sizeKB + "KB)");
    } else if (sizeKB > 200) {
      performance -= 10;
      issues.push("Strona mogłaby być lżejsza");
    }

    const total = Math.max(0, Math.round((seo + security + performance) / 3));

    // 🔥 ALERT: czy zwolniła
    const prev = sites
      .filter(s => s.url === url)
      .slice(-1)[0];

    if (prev && loadTime > prev.loadTime + 500) {
      alerts.push("⚠️ Strona zwolniła o ponad 500 ms");
    }

    const result = {
      id: Date.now(),
      url,
      total,
      seo,
      security,
      performance,
      loadTime,
      sizeKB,
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
      issues: ["Strona niedostępna"]
    });
  }
});

// historia dla domeny
app.get('/api/history', (req, res) => {
  const { url } = req.query;
  const data = sites.filter(s => s.url === url);
  res.json(data);
});

app.listen(process.env.PORT || 3000);
