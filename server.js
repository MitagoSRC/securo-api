const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();

app.use(cors());
app.use(express.json());

let history = [];

function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"");
}

// 🔥 AUDYT
app.post("/api/run-audit", async (req,res)=>{

  console.log("➡️ START AUDIT");

  try{
    let {url} = req.body;

    if(!url){
      return res.json({error:"Brak URL"});
    }

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    console.log("🌐 URL:", url);

    const browser = await puppeteer.launch({
      args:["--no-sandbox","--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const start = Date.now();

    await page.goto(url,{
      waitUntil:"networkidle2",
      timeout:20000
    });

    const loadTime = Date.now() - start;

    // ===== DOM =====
    const title = await page.title();

    const meta = await page.$eval(
      'meta[name="description"]',
      el => el.content
    ).catch(()=>null);

    const h1 = await page.$eval("h1", el=>el.innerText).catch(()=>null);

    // ===== HEADERS =====
    const response = await page.goto(url);
    const headers = response.headers();

    const https = url.startsWith("https");
    const csp = headers["content-security-policy"];
    const xss = headers["x-xss-protection"];

    // ===== METRICS =====
    const metrics = await page.metrics();

    const jsHeap = metrics.JSHeapUsedSize;

    const checks = {
      seo:{
        title:!!title,
        meta:!!meta,
        h1:!!h1
      },
      security:{
        https,
        csp:!!csp,
        xss:!!xss
      },
      performance:{
        fast:loadTime < 2000,
        jsHeap:jsHeap < 50000000
      }
    };

    let score = 100;

    if(!checks.seo.title) score -= 10;
    if(!checks.seo.meta) score -= 10;
    if(!checks.seo.h1) score -= 5;
    if(!checks.security.https) score -= 20;
    if(loadTime > 3000) score -= 20;

    const data = {
      url: normalize(url),
      score,
      loadTime,
      tech:["HTML"],
      checks,
      date:new Date().toISOString()
    };

    history.push(data);

    await browser.close();

    console.log("✅ DONE");

    res.json(data);

  }catch(e){
    console.log("❌ ERROR:", e.message);
    res.json({
      error:true,
      message:e.message
    });
  }
});

// HISTORY
app.get("/api/history",(req,res)=>{
  const url = normalize(req.query.url);
  res.json(history.filter(h=>h.url===url));
});

app.listen(3000,()=>console.log("🚀 API RUNNING"));
