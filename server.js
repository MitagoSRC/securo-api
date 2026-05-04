const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();

app.use(cors());
app.use(express.json());

let history = [];

function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"");
}

// 🔥 fetch z timeoutem (ważne)
async function fetchWithTimeout(url, timeout = 5000){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeout);

  try{
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  }catch(e){
    clearTimeout(id);
    return null;
  }
}

app.post("/api/run-audit", async (req,res)=>{

  try{

    let {url} = req.body;

    if(!url){
      return res.json({error:true,message:"Brak URL"});
    }

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const start = Date.now();

    const response = await fetchWithTimeout(url, 8000);

    if(!response){
      return res.json({error:true,message:"Strona nie odpowiada"});
    }

    const html = await response.text();
    const loadTime = Date.now() - start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").first().text();

    // robots + sitemap (z timeoutem)
    const base = new URL(url);

    const robotsRes = await fetchWithTimeout(base.origin + "/robots.txt", 3000);
    const sitemapRes = await fetchWithTimeout(base.origin + "/sitemap.xml", 3000);

    const checks = {
      seo:{
        title:!!title,
        metaDescription:!!meta,
        h1:!!h1,
        robotsTxt: robotsRes && robotsRes.status === 200,
        sitemapXml: sitemapRes && sitemapRes.status === 200
      },
      security:{
        https:url.startsWith("https")
      },
      performance:{
        fast:loadTime < 2000
      }
    };

    const data = {
      url,
      score: 90,
      loadTime,
      checks,
      date:new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  }catch(e){

    console.log("ERROR:", e.message);

    res.json({
      error:true,
      message:"Błąd analizy"
    });
  }
});

app.get("/api/history",(req,res)=>{
  res.json(history);
});

app.listen(3000,()=>console.log("🚀 API OK"));
