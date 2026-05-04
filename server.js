const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let history = [];

function normalize(url){
  return url.replace("http://","").replace("https://","").replace(/\/$/,"");
}

// 🔥 TEST ENDPOINT (czy działa POST)
app.post("/api/test", (req,res)=>{
  res.json({ok:true});
});

// 🔥 AUDYT (PROSTY NA START)
app.post("/api/run-audit", (req,res)=>{

  try{

    let {url} = req.body;

    if(!url){
      return res.json({error:true,message:"Brak URL"});
    }

    if(!url.startsWith("http")){
      url = "https://" + url;
    }

    const data = {
      url: normalize(url),
      score: 95,
      loadTime: 1200,
      tech:["HTML"],
      checks:{
        seo:{title:true,meta:true,h1:true},
        security:{https:true,csp:false,xss:false},
        performance:{fast:true,jsHeap:true}
      },
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

app.listen(3000,()=>console.log("🚀 BACKEND OK"));
