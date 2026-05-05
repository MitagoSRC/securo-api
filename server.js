const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// FETCH (SAFE)
// =====================
async function fetchPage(url){
  try{
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html"
      }
    });

    if(!res.ok){
      throw new Error("HTTP "+res.status);
    }

    const html = await res.text();
    return html;

  }catch(e){
    return null;
  }
}

// =====================
// AUDIT
// =====================
app.post("/api/run-audit", async (req,res)=>{

  let {url} = req.body;

  try{

    if(!url){
      return res.json({success:false, message:"Brak URL"});
    }

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const start = Date.now();
    const html = await fetchPage(url);
    const loadTime = Date.now() - start;

    if(!html){
      return res.json({
        success:false,
        message:"Nie można pobrać strony (blokada / błąd)"
      });
    }

    const $ = cheerio.load(html);

    const title = $("title").text() || "";
    const meta = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").length || 0;

    const size = html.length || 0;

    const checks = {
      title: title.length > 0,
      meta: meta.length > 0,
      h1: h1 > 0,
      fast: loadTime < 2000
    };

    const score =
      (checks.title ? 25 : 0) +
      (checks.meta ? 25 : 0) +
      (checks.h1 ? 25 : 0) +
      (checks.fast ? 25 : 0);

    return res.json({
      success:true,
      score,
      loadTime,
      size,
      checks
    });

  }catch(e){

    return res.json({
      success:false,
      message:"Crash API: "+e.message
    });
  }
});

app.listen(3000,()=>console.log("🚀 API OK"));
