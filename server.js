const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// ======= PSEUDO DB (RAM – na start) =======
let users = []; // {id, email, password, token, sites:[]}
let history = []; // {url, data...}
let wpDataStore = {}; // {normalizedUrl: {...}}

// ======= HELPERS =======
function normalizeUrl(url){
  if(!url) return "";
  return url
    .replace("http://","")
    .replace("https://","")
    .replace(/\/$/,"")
    .toLowerCase();
}

function makeToken(){
  return crypto.randomBytes(16).toString("hex");
}

function auth(req){
  const token = req.headers["authorization"];
  return users.find(u => u.token === token);
}

// ======= AUTH =======
app.post("/api/register", (req,res)=>{
  const {email,password} = req.body;
  if(!email || !password) return res.json({error:"missing"});

  if(users.find(u=>u.email===email)){
    return res.json({error:"exists"});
  }

  const token = makeToken();

  const user = {
    id: Date.now(),
    email,
    password,
    token,
    sites:[]
  };

  users.push(user);

  res.json({token});
});

app.post("/api/login", (req,res)=>{
  const {email,password} = req.body;

  const user = users.find(u=>u.email===email && u.password===password);
  if(!user) return res.json({error:"invalid"});

  res.json({token:user.token});
});

// ======= SITES =======
app.get("/api/sites", (req,res)=>{
  const user = auth(req);
  if(!user) return res.status(401).json({error:"unauthorized"});
  res.json(user.sites);
});

app.post("/api/sites", (req,res)=>{
  const user = auth(req);
  if(!user) return res.status(401).json({error:"unauthorized"});

  let {url} = req.body;
  if(!url) return res.json({error:"no url"});

  if(!url.startsWith("http")) url = "https://" + url;

  const clean = normalizeUrl(url);

  if(!user.sites.includes(clean)){
    user.sites.push(clean);
  }

  res.json({success:true, sites:user.sites});
});

// ======= AUDIT =======
app.post("/api/run-audit", async (req,res)=>{
  const {url} = req.body;
  const clean = normalizeUrl(url);

  const loadTime = Math.floor(Math.random()*1500)+500;
  const seo = 70 + Math.floor(Math.random()*30);
  const security = 70 + Math.floor(Math.random()*30);
  const performance = 60 + Math.floor(Math.random()*40);

  const issues = [];

  if(seo < 85) issues.push("Brak meta description");
  if(security < 80) issues.push("Otwarty REST API");
  if(performance < 70) issues.push("Strona wolno się ładuje");

  const data = {
    url: clean,
    total: Math.round((seo+security+performance)/3),
    seo,
    security,
    performance,
    loadTime,
    tech:["HTML","JavaScript"],
    issues,
    date: new Date().toISOString()
  };

  history.push(data);

  res.json(data);
});

// ======= HISTORY =======
app.get("/api/history", (req,res)=>{
  const clean = normalizeUrl(req.query.url);
  const filtered = history.filter(h=>h.url===clean);
  res.json(filtered);
});

// ======= WORDPRESS SAVE =======
app.post("/api/wp-data", (req,res)=>{
  const data = req.body;

  if(!data || !data.site){
    return res.json({success:false});
  }

  const key = normalizeUrl(data.site);

  wpDataStore[key] = {
    ...data,
    updated:new Date().toISOString()
  };

  res.json({success:true});
});

// ======= WORDPRESS GET =======
app.get("/api/wp-data", (req,res)=>{
  const key = normalizeUrl(req.query.url);

  if(key && wpDataStore[key]){
    return res.json(wpDataStore[key]);
  }

  const last = Object.values(wpDataStore).slice(-1)[0];
  res.json(last || {});
});

// ======= START =======
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("🚀 Securo PRO API:", PORT);
});
