const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "securo_secret_key";

// =====================
// DB
// =====================
const db = new sqlite3.Database("./securo.db");

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  url TEXT,
  score INTEGER,
  loadTime INTEGER,
  date TEXT
)`);

// =====================
// AUTH
// =====================
function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.status(401).json({error:true});

  try{
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  }catch{
    res.status(401).json({error:true});
  }
}

// =====================
// REGISTER
// =====================
app.post("/api/register", async (req,res)=>{
  const {email,password} = req.body;

  const hash = await bcrypt.hash(password,10);

  db.run(
    "INSERT INTO users(email,password) VALUES (?,?)",
    [email,hash],
    function(err){
      if(err) return res.json({error:true,message:"User exists"});
      res.json({success:true});
    }
  );
});

// =====================
// LOGIN
// =====================
app.post("/api/login",(req,res)=>{
  const {email,password} = req.body;

  db.get("SELECT * FROM users WHERE email=?",[email], async (err,user)=>{
    if(!user) return res.json({error:true});

    const ok = await bcrypt.compare(password,user.password);
    if(!ok) return res.json({error:true});

    const token = jwt.sign({id:user.id},SECRET);
    res.json({token});
  });
});

// =====================
// AUDIT
// =====================
async function fetchPage(url){
  const res = await fetch(url,{headers:{ "User-Agent":"Mozilla/5.0"}});
  const html = await res.text();
  return html;
}

app.post("/api/run-audit", auth, async (req,res)=>{

  try{

    let {url} = req.body;
    if(!url.startsWith("http")) url="https://"+url;

    const start = Date.now();
    const html = await fetchPage(url);
    const loadTime = Date.now()-start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").length;

    const size = html.length;

    const score =
      (title?20:0)+
      (meta?20:0)+
      (h1?20:0)+
      (loadTime<2000?20:0)+
      (size<200000?20:0);

    const data = {
      url,
      score,
      loadTime,
      date:new Date().toISOString(),
      checks:{
        seo:{title:!!title,meta:!!meta,h1:h1>0},
        performance:{fast:loadTime<2000,size:size<200000}
      }
    };

    db.run(
      "INSERT INTO audits(user_id,url,score,loadTime,date) VALUES (?,?,?,?,?)",
      [req.user.id,url,score,loadTime,data.date]
    );

    res.json(data);

  }catch(e){
    res.json({error:true});
  }
});

// =====================
// HISTORY
// =====================
app.get("/api/history", auth, (req,res)=>{

  db.all(
    "SELECT * FROM audits WHERE user_id=? ORDER BY id DESC",
    [req.user.id],
    (err,rows)=>{
      res.json(rows || []);
    }
  );

});

app.listen(3000,()=>console.log("🚀 API OK"));
