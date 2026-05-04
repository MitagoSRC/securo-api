const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let users = [];
let sites = [];

// 🔍 WYKRYWANIE TECHNOLOGII
function detectTech(html) {
  let tech = [];

  if (html.includes("wp-content")) tech.push("WordPress");
  if (html.includes("shopify")) tech.push("Shopify");
  if (html.includes("_next")) tech.push("Next.js");
  if (html.includes("react")) tech.push("React");
  if (html.includes("vue")) tech.push("Vue");
  if (html.includes("angular")) tech.push("Angular");

  if (tech.length === 0) tech.push("Custom / HTML");

  return tech;
}

// 🔥 AUDIT PRO++
app.post('/api/run-audit', async (req, res) => {
  const { url } = req.body;

  let seo = 100;
  let security = 100;
  let performance = 100;

  let issues = [];
  let passed = [];

  try {
    const start = Date.now();

    const response = await fetch(url);
    const html = await response.text();

    const loadTime = Date.now() - start;

    // 🔍 TECH
    const tech = detectTech(html);

    // SEO
    if (!html.includes("<title")) { seo -= 15; issues.push("Brak title"); }
    else passed.push("Title OK");

    if (!html.includes("meta name=\"description\"")) {
      seo -= 10; issues.push("Brak meta description");
    }

    if (!html.includes("<h1")) {
      seo -= 10; issues.push("Brak H1");
    }

    if (!(await check(url + "/sitemap.xml"))) {
      seo -= 5; issues.push("Brak sitemap");
    }

    // SECURITY
    if (!url.startsWith("https")) {
      security -= 20; issues.push("Brak HTTPS");
    }

    if (html.includes("wp-json")) {
      security -= 10; issues.push("Otwarty REST API");
    }

    // PERFORMANCE
    if (loadTime > 2000) {
      performance -= 20;
      issues.push("Wolne ładowanie strony");
    }

    if (html.length > 500000) {
      performance -= 10;
      issues.push("Duży rozmiar strony");
    }

    const total = Math.round((seo + security + performance) / 3);

    const result = {
      id: Date.now(),
      url,
      total,
      seo,
      security,
      performance,
      tech,
      issues,
      passed,
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

async function check(url) {
  try {
    const r = await fetch(url);
    return r.status === 200;
  } catch {
    return false;
  }
}

app.listen(process.env.PORT || 3000);
