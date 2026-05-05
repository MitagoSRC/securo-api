const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

async function fetchPage(url){
  const res = await fetch(url,{
    headers:{ "User-Agent":"Mozilla/5.0"}
  });
  const html = await res.text();
  return html;
}

app.post("/api/run-audit", async (req,res)=>{

  try{
    let {url} = req.body;

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const start = Date.now();
    const html = await fetchPage(url);
    const loadTime = Date.now() - start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").length;
    const size = html.length;

    const score =
      (title?25:0) +
      (meta?25:0) +
      (h1?25:0) +
      (loadTime<2000?25:0);

    res.json({
      success:true,
      score,
      loadTime,
      size,
      checks:{
        title:!!title,
        meta:!!meta,
        h1:h1>0,
        fast:loadTime<2000
      }
    });

  }catch(e){
    res.json({
      success:false,
      error:"Błąd analizy"
    });
  }
});

app.listen(3000,()=>console.log("🚀 API OK"));
