const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(express.json());

let lastAudit = null;

// =====================
// FETCH
// =====================
async function fetchPage(url){
  const res = await fetch(url,{
    headers:{ "User-Agent":"Mozilla/5.0" }
  });
  const html = await res.text();
  return {res, html};
}

// =====================
// AUDIT
// =====================
app.post("/api/run-audit", async (req,res)=>{

  try{
    let {url} = req.body;
    if(!url.startsWith("http")) url="https://"+url;

    const start = Date.now();
    const {res:response, html} = await fetchPage(url);
    const loadTime = Date.now()-start;

    const $ = cheerio.load(html);

    const title = $("title").text();
    const meta = $('meta[name="description"]').attr("content");
    const h1 = $("h1").length;
    const images = $("img").length;
    const imagesAlt = $("img[alt]").length;

    const links = $("a").length;
    const internal = $("a[href^='/']").length;

    const size = html.length;

    const checks = {
      seo:{
        title:!!title,
        meta:!!meta,
        h1:h1>0,
        alt: images > 0 ? imagesAlt === images : true
      },
      performance:{
        fast:loadTime<2000,
        size:size<200000
      },
      structure:{
        links:links>5,
        internal:internal>2
      }
    };

    const score =
      (checks.seo.title?15:0)+
      (checks.seo.meta?15:0)+
      (checks.seo.h1?10:0)+
      (checks.seo.alt?10:0)+
      (checks.performance.fast?20:0)+
      (checks.performance.size?10:0)+
      (checks.structure.links?10:0)+
      (checks.structure.internal?10:0);

    const data = {
      url, score, loadTime, size,
      links, internal,
      images, imagesAlt,
      checks,
      date:new Date().toISOString()
    };

    lastAudit = data;

    res.json(data);

  }catch(e){
    res.json({error:true});
  }
});

// =====================
// PDF PRO
// =====================
app.get("/api/pdf",(req,res)=>{

  if(!lastAudit) return res.send("Brak danych");

  const doc = new PDFDocument();

  res.setHeader("Content-Type","application/pdf");
  doc.pipe(res);

  doc.fontSize(20).text("Raport SEO PRO", {align:"center"});
  doc.moveDown();

  doc.text("Strona: "+lastAudit.url);
  doc.text("Score: "+lastAudit.score+"/100");
  doc.text("Czas ładowania: "+lastAudit.loadTime+" ms");
  doc.moveDown();

  doc.text("SEO:");
  doc.text("Title: "+(lastAudit.checks.seo.title?"OK":"Brak"));
  doc.text("Meta: "+(lastAudit.checks.seo.meta?"OK":"Brak"));
  doc.text("H1: "+(lastAudit.checks.seo.h1?"OK":"Brak"));

  doc.moveDown();
  doc.text("Performance:");
  doc.text("Szybkość: "+(lastAudit.checks.performance.fast?"OK":"Wolna"));
  doc.text("Rozmiar HTML: "+lastAudit.size);

  doc.end();
});

// =====================
// LEAD
// =====================
app.post("/api/lead",(req,res)=>{

  const {email, url} = req.body;

  console.log("NOWY LEAD:", email, url);

  res.json({success:true});
});

app.listen(3000,()=>console.log("🚀 API OK"));
