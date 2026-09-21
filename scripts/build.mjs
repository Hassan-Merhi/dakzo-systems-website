import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const project=fileURLToPath(new URL("../",import.meta.url));
const source=join(project,"website");
const output=join(project,"dist");
const siteUrl=(process.env.SITE_URL||"https://dakzosystems.com").replace(/\/$/,"");
const routes=["/","/services/","/pricing/","/about/","/demo/","/privacy/","/terms/"];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(output,"sitemap.xml"),sitemap);
await writeFile(join(output,"robots.txt"),`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(join(output,"health.json"),JSON.stringify({status:"ok",site:"Dakzo Systems"}));
await writeFile(join(output,"404.html"),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 | Dakzo Systems</title><link rel="stylesheet" href="/assets/styles.css"><body><main class="page-hero"><div class="container"><div class="eyebrow">404</div><h1>Page introuvable.</h1><p><a class="button" href="/">Retour à l’accueil</a></p></div></main></body></html>`);
console.log(`Dakzo build complete: ${routes.length} routes`);
