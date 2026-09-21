import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("./dist/",import.meta.url));
const port=Number(process.env.PORT||10000);
const webhook=process.env.AIRTABLE_LEAD_WEBHOOK_URL;
const rate=new Map();
const serviceChoices=new Set(["Website","POS","Inventory","Payroll","ERP","Custom System","Other"]);
const contactChoices=new Set(["WhatsApp","Phone","Email"]);
const languageChoices=new Set(["French","English"]);
const formChoices=new Set(["Demo Request","Contact","Quote Request"]);

const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".json":"application/json; charset=utf-8",".xml":"application/xml; charset=utf-8",".txt":"text/plain; charset=utf-8"};

function headers(extra={}){
  return {
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Referrer-Policy":"strict-origin-when-cross-origin",
    "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":"default-src 'self'; script-src 'self' https://www.googletagmanager.com https://tagmanager.google.com; script-src-elem 'self' https://www.googletagmanager.com https://tagmanager.google.com; style-src 'self' https://www.googletagmanager.com https://tagmanager.google.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com https://ssl.gstatic.com https://www.gstatic.com; connect-src 'self' https://www.googletagmanager.com https://tagmanager.google.com https://*.google-analytics.com https://*.google.com; frame-src https://www.googletagmanager.com https://tagmanager.google.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ...extra
  };
}
function json(res,status,payload){res.writeHead(status,headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}));res.end(JSON.stringify(payload))}
function clean(value,max=500){return String(value??"").trim().replace(/[\u0000-\u001F\u007F]/g," ").slice(0,max)}
function number(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.min(Math.floor(n),1000000):0}
function clientIp(req){return clean(req.headers["x-forwarded-for"]?.split(",")[0]||req.socket.remoteAddress||"unknown",80)}
function rateAllowed(ip){
  const now=Date.now(),windowMs=15*60*1000,max=5;
  const record=rate.get(ip);
  if(!record||now-record.start>windowMs){rate.set(ip,{start:now,count:1});return true}
  if(record.count>=max)return false;
  record.count+=1;return true;
}
async function bodyJson(req){
  let raw="";
  for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)throw new Error("Payload too large")}
  return JSON.parse(raw||"{}");
}
function sameOrigin(req){
  const origin=req.headers.origin;
  if(!origin)return true;
  try{
    const host=req.headers["x-forwarded-host"]||req.headers.host;
    return new URL(origin).host===host;
  }catch{return false}
}
async function submitLead(req,res){
  if(!sameOrigin(req))return json(res,403,{error:"Invalid origin"});
  const ip=clientIp(req);
  if(!rateAllowed(ip))return json(res,429,{error:"Too many requests"});
  let input;
  try{input=await bodyJson(req)}catch{return json(res,400,{error:"Invalid request"})}
  if(clean(input.website,200))return json(res,200,{success:true});

  const lead={
    fullName:clean(input.fullName,120),
    email:clean(input.email,180),
    phone:clean(input.phone,80),
    companyName:clean(input.companyName,160),
    industry:clean(input.industry,160),
    employees:number(input.employees),
    branches:number(input.branches),
    serviceInterest:clean(input.serviceInterest,80),
    businessNeed:clean(input.businessNeed,2500),
    currentSystem:clean(input.currentSystem,300),
    preferredContact:clean(input.preferredContact,40),
    preferredLanguage:clean(input.preferredLanguage,30),
    formType:clean(input.formType,40),
    sourcePage:clean(input.sourcePage,500),
    referrer:clean(input.referrer,500),
    utmSource:clean(input.utmSource,160),
    utmMedium:clean(input.utmMedium,160),
    utmCampaign:clean(input.utmCampaign,200),
    utmContent:clean(input.utmContent,200),
    utmTerm:clean(input.utmTerm,200),
    contactConsent:input.contactConsent===true
  };

  if(!lead.fullName||!lead.companyName||(!lead.email&&!lead.phone)||!lead.businessNeed||!lead.contactConsent)return json(res,400,{error:"Missing required fields"});
  if(!serviceChoices.has(lead.serviceInterest)||!contactChoices.has(lead.preferredContact)||!languageChoices.has(lead.preferredLanguage)||!formChoices.has(lead.formType))return json(res,400,{error:"Invalid selection"});
  if(lead.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))return json(res,400,{error:"Invalid email"});
  if(!webhook)return json(res,503,{error:"Lead intake is not configured"});

  try{
    const response=await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","User-Agent":"DakzoSystems/1.0"},body:JSON.stringify(lead),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error("Airtable webhook failed");
    return json(res,200,{success:true});
  }catch(error){
    console.error("Lead submission failed:",error?.message||error);
    return json(res,502,{error:"Lead submission unavailable"});
  }
}
async function serve(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==="/health")return json(res,200,{ok:true});
  if(pathname==="/contact"||pathname==="/contact/"){res.writeHead(302,headers({Location:"/demo/"}));return res.end()}
  if(pathname.endsWith("/"))pathname+="index.html";
  let file=normalize(join(root,pathname.replace(/^\/+/,'')));
  if(!file.startsWith(root)){res.writeHead(403,headers());return res.end("Forbidden")}
  try{
    const info=await stat(file);
    if(info.isDirectory())file=join(file,"index.html");
    const data=await readFile(file);
    const ext=extname(file);
    const cache=ext===".html"?"no-cache":"public, max-age=86400";
    res.writeHead(200,headers({"Content-Type":types[ext]||"application/octet-stream","Cache-Control":cache}));
    res.end(data);
  }catch{
    try{
      const data=await readFile(join(root,"404.html"));
      res.writeHead(404,headers({"Content-Type":"text/html; charset=utf-8"}));res.end(data);
    }catch{res.writeHead(404,headers());res.end("Not found")}
  }
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||"/","http://localhost");
  if(req.method==="POST"&&url.pathname==="/api/leads")return submitLead(req,res);
  if(req.method==="GET"||req.method==="HEAD")return serve(req,res,url);
  res.writeHead(405,headers({Allow:"GET, HEAD, POST"}));res.end("Method not allowed");
});
server.listen(port,"0.0.0.0",()=>console.log(`Dakzo Systems listening on ${port}`));
