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

// 🔥 fetch z timeout + UA (KLUCZOWE)
async function fetchSafe(url, timeout = 5000){

  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeout);

  try{
    const res = await fetch(url,{
      signal: controller.signal,
      headers:{
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    clearTimeout(id);
    return res;

  }catch(e){
    clearTimeout(id);
    return null;
  }
}

// 🔥 MAIN
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

    // 🔥 NAJWAŻNIEJSZE
    const response = await fetchSafe(url, 6000);

    if(!response){
      return res.json({
        error:true,
        message:"Strona nie odpowiada / blokuje boty"
      });
    }

    const html = await response.text();
    const loadTime = Date.now() - start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").first().text();

    const checks = {
      seo:{
        title:!!title,
        metaDescription:!!meta,
        h1:!!h1
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

    // 🔥 ZAWSZE ODPOWIADAMY
    return res.json(data);

  }catch(e){

    console.log("ERROR:", e.message);

    return res.json({
      error:true,
      message:"Timeout / blokada strony"
    });
  }
});

// HISTORY
app.get("/api/history",(req,res)=>{
  res.json(history);
});

app.listen(3000,()=>console.log("🚀 API OK"));
