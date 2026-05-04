const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let users = [];
let sites = [];

function findUser(email) {
  return users.find(u => u.email === email);
}

// AUTH
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (findUser(email)) return res.json({ error: "User exists" });
  users.push({ email, password });
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = findUser(email);
  if (!user || user.password !== password)
    return res.json({ error: "Bad login" });

  res.json({ success: true, email });
});

// 🔥 AUDIT PRO
app.post('/api/run-audit', async (req, res) => {
  const { url, email } = req.body;

  let score = 100;
  let issues = [];
  let passed = [];

  try {
    const response = await fetch(url);
    const html = await response.text();

    // HTTPS
    if (!url.startsWith('https')) {
      score -= 15;
      issues.push("Brak HTTPS");
    } else passed.push("HTTPS OK");

    // TITLE
    if (!html.toLowerCase().includes('<title>')) {
      score -= 10;
      issues.push("Brak title");
    } else passed.push("Title OK");

    // META
    if (!html.toLowerCase().includes('meta name="description"')) {
      score -= 10;
      issues.push("Brak meta description");
    } else passed.push("Meta description OK");

    // H1
    if (!html.toLowerCase().includes('<h1')) {
      score -= 10;
      issues.push("Brak H1");
    } else passed.push("H1 OK");

    // ROBOTS
    if (!await check(url + "/robots.txt")) {
      score -= 5;
      issues.push("Brak robots.txt");
    } else passed.push("robots.txt OK");

    // SITEMAP
    if (!await check(url + "/sitemap.xml")) {
      score -= 5;
      issues.push("Brak sitemap.xml");
    } else passed.push("Sitemap OK");

    // WORDPRESS
    if (html.includes("wp-content")) {
      passed.push("WordPress wykryty");

      if (html.includes("wp-json")) {
        score -= 10;
        issues.push("Otwarty REST API (/wp-json)");
      }
    }

    // PERFORMANCE (prosty)
    if (html.length > 500000) {
      score -= 10;
      issues.push("Strona bardzo ciężka");
    }

  } catch {
    score = 0;
    issues.push("Strona niedostępna");
  }

  const result = {
    id: Date.now(),
    url,
    score,
    issues,
    passed,
    email,
    date: new Date().toISOString()
  };

  sites.push(result);

  res.json(result);
});

async function check(url) {
  try {
    const r = await fetch(url);
    return r.status === 200;
  } catch {
    return false;
  }
}

// USER DATA
app.get('/api/sites/:email', (req, res) => {
  res.json(sites.filter(s => s.email === req.params.email));
});

app.listen(process.env.PORT || 3000);
