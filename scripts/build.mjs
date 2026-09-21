import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const project=fileURLToPath(new URL("../",import.meta.url));
const source=join(project,"website");
const output=join(project,"dist");
const siteUrl=(process.env.SITE_URL||"https://dakzosystems.com").replace(/\/$/,"");
const gtmId=(process.env.GTM_ID||"").trim();
const googleSiteVerification=(process.env.GOOGLE_SITE_VERIFICATION||"").trim();
const routes=["/","/services/","/pricing/","/about/","/demo/","/privacy/","/terms/"];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});

function trackingMarkup(){
  const validGtm=/^GTM-[A-Z0-9]+$/i.test(gtmId);
  const headParts=[];
  let bodyStart="";

  if(googleSiteVerification){
    const safeToken=googleSiteVerification.replace(/["<>]/g,"");
    headParts.push(`<meta name="google-site-verification" content="${safeToken}">`);
  }

  if(validGtm){
    headParts.push(`<!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script><!-- End Google Tag Manager -->`);
    bodyStart=`<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->`;
  }

  return {head:headParts.join(""),bodyStart};
}

const tracking=trackingMarkup();
for(const route of routes){
  const relative=route==="/"
    ?"index.html"
    :join(route.replace(/^\/+|\/+$/g,""),"index.html");
  const path=join(output,relative);
  let html=await readFile(path,"utf8");
  if(tracking.head)html=html.replace("</head>",`${tracking.head}</head>`);
  if(tracking.bodyStart)html=html.replace("<body>",`<body>${tracking.bodyStart}`);
  await writeFile(path,html);
}

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(output,"sitemap.xml"),sitemap);
await writeFile(join(output,"robots.txt"),`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(join(output,"health.json"),JSON.stringify({
  status:"ok",
  site:"Dakzo Systems",
  tracking:{gtm:Boolean(/^GTM-[A-Z0-9]+$/i.test(gtmId)),searchConsole:Boolean(googleSiteVerification)}
}));
await writeFile(join(output,"404.html"),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 | Dakzo Systems</title><link rel="stylesheet" href="/assets/styles.css"><body><main class="page-hero"><div class="container"><div class="eyebrow">404</div><h1>Page introuvable.</h1><p><a class="button" href="/">Retour à l’accueil</a></p></div></main></body></html>`);
console.log(`Dakzo build complete: ${routes.length} routes | GTM: ${/^GTM-[A-Z0-9]+$/i.test(gtmId)?"enabled":"not configured"} | Search Console: ${googleSiteVerification?"verification token present":"not configured"}`);
