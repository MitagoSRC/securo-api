const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

let history = [];

// normalize
function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"");
}

// 🔥 REAL AUDIT
app.post("/api/run-audit", async (req,res)=>{

  try{

    let {url} = req.body;
    if(!url.startsWith("http")) url = "https://" + url;

    const browser = await puppeteer.launch({
      args: ["--no-sandbox","--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const start = Date.now();

    await page.goto(url,{
      waitUntil:"networkidle2",
      timeout:30000
    });

    const loadTime = Date.now() - start;

    // ===== DOM =====
    const title = await page.title();

    const meta = await page.$eval(
      'meta[name="description"]',
      el => el.content
    ).catch(()=>null);

    const h1 = await page.$eval("h1", el=>el.innerText).catch(()=>null);

    // ===== PERFORMANCE =====
    const metrics = await page.metrics();

    const jsHeap = metrics.JSHeapUsedSize;

    // ===== SECURITY =====
    const response = await page.goto(url);
    const headers = response.headers();

    const https = url.startsWith("https");
    const csp = headers["content-security-policy"];
    const xss = headers["x-xss-protection"];

    // ===== TECHNOLOGY =====
    const content = await page.content();

    const tech = [];
    if(content.includes("wp-content")) tech.push("WordPress");
    if(content.includes("react")) tech.push("React");

    // ===== CHECKS =====
    const checks = {
      seo: {
        title: !!title,
        meta: !!meta,
        h1: !!h1
      },
      security: {
        https,
        csp: !!csp,
        xss: !!xss
      },
      performance: {
        fast: loadTime < 2000,
        jsHeap: jsHeap < 50_000_000
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
      tech,
      checks,
      date:new Date().toISOString()
    };

    history.push(data);

    await browser.close();

    res.json(data);

  }catch(e){
    console.log(e);
    res.json({error:"audit failed"});
  }
});

// history
app.get("/api/history",(req,res)=>{
  const url = normalize(req.query.url);
  res.json(history.filter(h=>h.url===url));
});

app.listen(3000,()=>console.log("🚀 REAL PRO AUDIT"));
