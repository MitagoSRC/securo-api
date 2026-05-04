const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sites = [];

app.get('/', (req, res) => {
  res.send('Securo API działa 🚀');
});

app.get('/api/sites', (req, res) => {
  res.json(sites);
});

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

app.listen(3000);