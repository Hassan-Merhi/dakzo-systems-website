const translations={
  fr:{
    navHome:"Accueil",navServices:"Services",navPricing:"Tarifs",navAbout:"À propos",navDemo:"Demander une démo",
    footerText:"Sites web, systèmes de gestion, ERP et logiciels sur mesure.",privacy:"Confidentialité",terms:"Conditions"
  },
  en:{
    navHome:"Home",navServices:"Services",navPricing:"Pricing",navAbout:"About",navDemo:"Request a Demo",
    footerText:"Websites, business systems, ERP and custom software.",privacy:"Privacy",terms:"Terms"
  }
};
const storageKey="dakzo-language";
function language(){return localStorage.getItem(storageKey)==="en"?"en":"fr"}
function applyLanguage(lang){
  localStorage.setItem(storageKey,lang);document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;const value=translations[lang]?.[key];if(value)el.textContent=value});
  document.querySelectorAll("[data-fr][data-en]").forEach(el=>{el.textContent=lang==="fr"?el.dataset.fr:el.dataset.en});
  document.querySelectorAll("[data-lang]").forEach(btn=>btn.classList.toggle("active",btn.dataset.lang===lang));
  trackEvent("language_switch",{language:lang,page_path:location.pathname});
}
function trackEvent(name,payload={}){
  window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,...payload});
}
window.Dakzo={trackEvent};
document.addEventListener("DOMContentLoaded",()=>{
  const lang=language();applyLanguage(lang);
  trackEvent("page_view",{language:lang,page_path:location.pathname});
  const menu=document.querySelector("[data-menu-toggle]"),nav=document.querySelector("[data-nav]");
  menu?.addEventListener("click",()=>nav?.classList.toggle("open"));
  document.querySelectorAll("[data-lang]").forEach(btn=>btn.addEventListener("click",()=>applyLanguage(btn.dataset.lang)));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>trackEvent(el.dataset.track,{language:language(),cta_location:el.dataset.location||"",service:el.dataset.service||""})));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}}),{threshold:.12});
  document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
  const form=document.querySelector("[data-lead-form]");
  if(form) initLeadForm(form);
});
function getAttribution(){
  const params=new URLSearchParams(location.search);const keys=["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const saved=JSON.parse(sessionStorage.getItem("dakzo-attribution")||"{}");
  keys.forEach(k=>{if(params.get(k))saved[k]=params.get(k)});
  sessionStorage.setItem("dakzo-attribution",JSON.stringify(saved));return saved;
}
getAttribution();
function initLeadForm(form){
  let started=false;
  form.addEventListener("input",()=>{if(!started){started=true;trackEvent("form_start",{language:language(),form_type:"demo_request"})}});
  form.addEventListener("submit",async e=>{
    e.preventDefault();const status=form.querySelector("[data-form-status]"),button=form.querySelector("button[type=submit]");
    const fd=new FormData(form),attr=getAttribution();
    const payload={
      fullName:String(fd.get("fullName")||"").trim(),
      email:String(fd.get("email")||"").trim(),
      phone:String(fd.get("phone")||"").trim(),
      companyName:String(fd.get("companyName")||"").trim(),
      industry:String(fd.get("industry")||"").trim(),
      employees:Number(fd.get("employees")||0)||0,
      branches:Number(fd.get("branches")||0)||0,
      serviceInterest:String(fd.get("serviceInterest")||""),
      businessNeed:String(fd.get("businessNeed")||"").trim(),
      currentSystem:String(fd.get("currentSystem")||"").trim(),
      preferredContact:String(fd.get("preferredContact")||"WhatsApp"),
      preferredLanguage:language()==="fr"?"French":"English",
      formType:String(fd.get("formType")||"Demo Request"),
      sourcePage:location.href,
      referrer:document.referrer,
      utmSource:attr.utm_source||"",
      utmMedium:attr.utm_medium||"",
      utmCampaign:attr.utm_campaign||"",
      utmContent:attr.utm_content||"",
      utmTerm:attr.utm_term||"",
      contactConsent:fd.get("contactConsent")==="on",
      website:String(fd.get("website")||"")
    };
    if(!payload.fullName||!payload.companyName||(!payload.email&&!payload.phone)||!payload.serviceInterest||!payload.businessNeed||!payload.contactConsent){
      status.textContent=language()==="fr"?"Veuillez remplir tous les champs obligatoires.":"Please complete all required fields.";status.className="form-status error";return;
    }
    button.disabled=true;button.textContent=language()==="fr"?"Envoi...":"Sending...";
    try{
      const response=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Submission failed");
      status.textContent=language()==="fr"?"Merci. Votre demande a été envoyée à Dakzo.":"Thank you. Your request was sent to Dakzo.";status.className="form-status ok";
      trackEvent("lead_submit",{language:language(),form_type:payload.formType.toLowerCase().replaceAll(" ","_"),service:payload.serviceInterest});
      form.reset();
    }catch(err){
      status.textContent=language()==="fr"?"Une erreur est survenue. Réessayez ou écrivez à hello@dakzosystems.com.":"Something went wrong. Try again or email hello@dakzosystems.com.";status.className="form-status error";
    }finally{button.disabled=false;button.textContent=language()==="fr"?"Envoyer ma demande":"Send my request"}
  });
}
