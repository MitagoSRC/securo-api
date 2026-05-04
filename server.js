const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

let history = [];

function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"");
}

app.post("/api/run-audit", async (req,res)=>{

  try{

    let {url} = req.body;

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const start = Date.now();

    const response = await fetch(url);
    const html = await response.text();

    const loadTime = Date.now() - start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").first().text();

    const checks = {
      seo:{
        title:!!title,
        meta:!!meta,
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
      url: normalize(url),
      score: 90,
      loadTime,
      tech:["HTML"],
      checks,
      date:new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  }catch(e){
    res.json({error:true,message:e.message});
  }
});

app.get("/api/history",(req,res)=>{
  const url = normalize(req.query.url);
  res.json(history.filter(h=>h.url===url));
});

app.listen(3000,()=>console.log("API działa"));
