const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 pseudo baza
let users = [];
let sites = [];

// helper
function findUser(email) {
  return users.find(u => u.email === email);
}

// 🔐 rejestracja
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;

  if (findUser(email)) {
    return res.json({ error: "Użytkownik istnieje" });
  }

  users.push({ email, password });
  res.json({ success: true });
});

// 🔐 logowanie
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const user = findUser(email);

  if (!user || user.password !== password) {
    return res.json({ error: "Błędne dane" });
  }

  res.json({ success: true, email });
});

// 🔍 audit
app.post('/api/run-audit', async (req, res) => {
  const { url, email } = req.body;

  let score = 100;
  let issues = [];

  try {
    const response = await fetch(url);
    const html = await response.text();

    if (!url.startsWith('https')) {
      score -= 20;
      issues.push('Brak HTTPS');
    }

    if (!html.toLowerCase().includes('<title>')) {
      score -= 10;
      issues.push('Brak title');
    }

    if (!html.toLowerCase().includes('meta name="description"')) {
      score -= 10;
      issues.push('Brak meta description');
    }

    if (!html.toLowerCase().includes('<h1')) {
      score -= 10;
      issues.push('Brak H1');
    }

  } catch {
    score = 0;
    issues.push('Strona niedostępna');
  }

  const result = {
    id: Date.now(),
    url,
    score,
    issues,
    email,
    date: new Date().toISOString()
  };

  sites.push(result);

  res.json(result);
});

// 📦 pobierz tylko swoje dane
app.get('/api/sites/:email', (req, res) => {
  const userSites = sites.filter(s => s.email === req.params.email);
  res.json(userSites);
});

// 🔄 CRON (co 24h)
setInterval(async () => {
  console.log("Auto scan...");

  for (let site of sites) {
    try {
      const response = await fetch(site.url);
      const html = await response.text();

      let score = 100;

      if (!html.includes('<title>')) score -= 10;

      site.score = score;
      site.date = new Date().toISOString();

    } catch {}
  }

}, 1000 * 60 * 60 * 24);

app.listen(process.env.PORT || 3000);
