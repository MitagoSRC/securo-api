const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

let history = [];

async function fetchPage(url){
  const res = await fetch(url, {
    headers:{
      "User-Agent":"Mozilla/5.0"
    }
  });

  const html = await res.text();
  return {res, html};
}

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

    // ================= SEO =================
    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").length;
    const images = $("img").length;
    const imagesAlt = $("img[alt]").length;

    // ================= LINKS =================
    const links = $("a").length;
    const internalLinks = $("a[href^='/']").length;

    // ================= HEADERS =================
    const headers = response.headers;

    const security = {
      https: url.startsWith("https"),
      csp: headers.get("content-security-policy"),
      xss: headers.get("x-xss-protection"),
      hsts: headers.get("strict-transport-security"),
      xframe: headers.get("x-frame-options")
    };

    // ================= PERFORMANCE =================
    const size = html.length;

    const performance = {
      fast: loadTime < 2000,
      size: size < 200000,
      loadTime
    };

    // ================= SCORE =================
    let score = 0;

    if(title) score+=10;
    if(meta) score+=10;
    if(h1) score+=10;
    if(security.https) score+=10;
    if(performance.fast) score+=10;
    if(performance.size) score+=10;

    const data = {
      url,
      score,
      loadTime,
      size,
      checks:{
        seo:{
          title:!!title,
          meta:!!meta,
          h1:h1>0,
          imagesAlt:imagesAlt === images
        },
        security:{
          https:!!security.https,
          csp:!!security.csp,
          xss:!!security.xss,
          hsts:!!security.hsts,
          xframe:!!security.xframe
        },
        performance:{
          fast:performance.fast,
          size:performance.size
        },
        links:{
          total:links,
          internal:internalLinks
        }
      },
      date:new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  }catch(e){
    res.json({error:true,message:"Błąd analizy"});
  }
});

app.get("/api/history",(req,res)=>{
  res.json(history);
});

app.listen(3000,()=>console.log("🚀 API OK"));
