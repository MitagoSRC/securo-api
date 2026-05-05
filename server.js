const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

let history = [];

// ======================
// FETCH
// ======================
async function fetchPage(url){
  const res = await fetch(url,{
    headers:{ "User-Agent":"Mozilla/5.0" }
  });

  const html = await res.text();
  return {res, html};
}

// ======================
// CRAWLER (max 5 stron)
// ======================
async function crawl(url, limit = 5){

  const visited = new Set();
  const results = [];

  async function visit(u){
    if(visited.size >= limit) return;
    if(visited.has(u)) return;

    try{
      visited.add(u);

      const {res, html} = await fetchPage(u);
      const $ = cheerio.load(html);

      const title = $("title").text();
      const h1 = $("h1").length;

      results.push({
        url:u,
        title:!!title,
        h1:h1>0
      });

      const links = $("a[href]").map((i,el)=>$(el).attr("href")).get();

      for(let link of links){
        if(link.startsWith("/") && visited.size < limit){
          await visit(url + link);
        }
      }

    }catch(e){}
  }

  await visit(url);

  return results;
}

// ======================
// MAIN API
// ======================
app.post("/api/run-audit", async (req,res)=>{

  try{

    let {url} = req.body;

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const start = Date.now();

    const {res:response, html} = await fetchPage(url);

    const loadTime = Date.now() - start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").length;

    const size = html.length;

    const crawlerData = await crawl(url);

    const score = (
      (title?20:0) +
      (meta?20:0) +
      (h1?20:0) +
      (loadTime<2000?20:0) +
      (size<200000?20:0)
    );

    const data = {
      url,
      score,
      loadTime,
      size,
      pages: crawlerData,
      checks:{
        seo:{
          title:!!title,
          meta:!!meta,
          h1:h1>0
        },
        performance:{
          fast:loadTime<2000,
          size:size<200000
        }
      },
      date:new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  }catch(e){
    res.json({error:true,message:"Crawler error"});
  }
});

app.get("/api/history",(req,res)=>{
  res.json(history);
});

app.listen(3000,()=>console.log("🚀 API OK"));
