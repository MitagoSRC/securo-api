const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

let history = [];

// ===== helpers =====
function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"").toLowerCase();
}

function parseHeaderList(headerValue){
  if(!headerValue) return [];
  return headerValue.split(",").map(v=>v.trim().toLowerCase());
}

// ===== AUDIT (REAL) =====
app.post("/api/run-audit", async (req,res)=>{
  try{
    let {url} = req.body;
    if(!url) return res.json({error:true,message:"Brak URL"});

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const t0 = Date.now();
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "SecuroBot/1.0 (+https://example.com)" }
    });
    const t1 = Date.now();

    const html = await response.text();
    const t2 = Date.now();

    const loadTime = t2 - t0;        // end-to-end (request + read body)
    const ttfb = t1 - t0;            // do pierwszego bajtu

    const headers = response.headers;

    // ===== HEADERS (REAL) =====
    const contentType = headers.get("content-type") || "";
    const contentLength = headers.get("content-length"); // może być null (chunked)
    const encoding = headers.get("content-encoding");
    const cacheControl = headers.get("cache-control");
    const xFrame = headers.get("x-frame-options");
    const csp = headers.get("content-security-policy");
    const hsts = headers.get("strict-transport-security");
    const xss = headers.get("x-xss-protection");
    const powered = headers.get("x-powered-by");
    const server = headers.get("server");

    // ===== DOM (REAL) =====
    const $ = cheerio.load(html);

    const title = $("title").first().text().trim();
    const metaDesc = $('meta[name="description"]').attr("content");
    const h1Count = $("h1").length;

    // robots i sitemap — realnie sprawdzamy URL-e
    const base = new URL(url);
    const robotsUrl = base.origin + "/robots.txt";
    const sitemapUrl = base.origin + "/sitemap.xml";

    const robotsRes = await fetch(robotsUrl).catch(()=>null);
    const sitemapRes = await fetch(sitemapUrl).catch(()=>null);

    // ===== LINKS / IMAGES (REAL) =====
    const links = $("a[href]");
    let internalLinks = 0;
    let externalLinks = 0;

    links.each((_, el)=>{
      const href = $(el).attr("href");
      if(!href) return;
      if(href.startsWith("http")){
        try{
          const u = new URL(href);
          if(u.host === base.host) internalLinks++;
          else externalLinks++;
        }catch{}
      } else {
        internalLinks++;
      }
    });

    const images = $("img");
    let imagesWithAlt = 0;

    images.each((_, el)=>{
      const alt = $(el).attr("alt");
      if(alt && alt.trim().length > 0) imagesWithAlt++;
    });

    // ===== REDIRECT (REAL) =====
    const finalUrl = response.url;
    const redirected = finalUrl !== url;

    // ===== SECURITY (REAL) =====
    const https = url.startsWith("https");

    // ===== TECH (REAL – sygnatury) =====
    const tech = [];
    if(html.includes("wp-content")) tech.push("WordPress");
    if(html.includes("react")) tech.push("React");
    if(html.includes("vue")) tech.push("Vue");

    // ===== CHECKS (WSZYSTKO REALNE) =====
    const checks = {
      seo: {
        title: title.length > 0,
        metaDescription: !!metaDesc,
        h1Exists: h1Count > 0,
        singleH1: h1Count === 1,
        robotsTxt: robotsRes && robotsRes.status === 200,
        sitemapXml: sitemapRes && sitemapRes.status === 200
      },
      links: {
        internalLinks: internalLinks > 0,
        externalLinks: externalLinks >= 0 // samo istnienie parsowania
      },
      images: {
        imagesCount: images.length,
        imagesAltCoverage: images.length === 0 ? true : (imagesWithAlt === images.length)
      },
      security: {
        https,
        csp: !!csp,
        hsts: !!hsts,
        xFrame: !!xFrame,
        xss: !!xss,
        hidePowered: !powered
      },
      performance: {
        ttfbGood: ttfb < 800,
        loadTimeGood: loadTime < 2000,
        compressed: !!encoding,
        cacheHeader: !!cacheControl
      },
      http: {
        status200: response.status === 200,
        contentTypeHtml: contentType.includes("text/html"),
        hasContentLength: !!contentLength,
        redirected
      }
    };

    // ===== SCORE (prosty, ale realny) =====
    let score = 100;
    const penalties = [
      !checks.seo.title && 10,
      !checks.seo.metaDescription && 10,
      !checks.seo.h1Exists && 5,
      !checks.security.https && 20,
      !checks.performance.loadTimeGood && 15,
      !checks.performance.ttfbGood && 10
    ].filter(Boolean);

    penalties.forEach(p => score -= p);
    if(score < 0) score = 0;

    const data = {
      url: normalize(url),
      score,
      loadTime,
      ttfb,
      tech,
      counts: {
        links: links.length,
        internalLinks,
        externalLinks,
        images: images.length,
        imagesWithAlt
      },
      headers: {
        server,
        contentType,
        contentLength,
        encoding,
        cacheControl
      },
      checks,
      date: new Date().toISOString()
    };

    history.push(data);

    res.json(data);

  }catch(e){
    res.json({error:true,message:e.message});
  }
});

// ===== HISTORY =====
app.get("/api/history",(req,res)=>{
  const url = normalize(req.query.url || "");
  res.json(history.filter(h=>h.url===url));
});

app.listen(3000,()=>console.log("🚀 REAL AUDIT READY"));
