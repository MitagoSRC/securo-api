const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sites = [];

// Strona główna
app.get('/', (req, res) => {
  res.send('Securo API działa 🚀');
});

// Lista wyników
app.get('/api/sites', (req, res) => {
  res.json(sites);
});

// NOWY: prawdziwy audit po stronie serwera
app.post('/api/run-audit', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Brak URL' });
  }

  let score = 100;
  let issues = [];

  try {
    const response = await fetch(url);
    const html = await response.text();

    // HTTPS
    if (!url.startsWith('https')) {
      score -= 20;
      issues.push('Brak HTTPS');
    }

    // Title
    if (!html.toLowerCase().includes('<title>')) {
      score -= 10;
      issues.push('Brak tagu <title>');
    }

    // Meta description
    if (!html.toLowerCase().includes('meta name="description"')) {
      score -= 10;
      issues.push('Brak meta description');
    }

    // H1
    if (!html.toLowerCase().includes('<h1')) {
      score -= 10;
      issues.push('Brak nagłówka H1');
    }

  } catch (e) {
    score = 0;
    issues.push('Nie można pobrać strony');
  }

  const result = {
    id: Date.now(),
    url,
    score,
    issues,
    date: new Date().toISOString()
  };

  sites.push(result);

  res.json(result);
});

// stary endpoint (zostawiamy)
app.post('/api/audit', (req, res) => {
  const { url, score } = req.body;

  sites.push({
    id: Date.now(),
    url,
    score,
    date: new Date().toISOString()
  });

  res.json({ status: 'saved' });
});

// WAŻNE: port dla Render
app.listen(process.env.PORT || 3000);
