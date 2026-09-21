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

function getStoredAttribution(){
  try{return JSON.parse(sessionStorage.getItem("dakzo-attribution")||"{}")}catch{return {}}
}
function analyticsContext(){
  const attr=getStoredAttribution();
  return {
    utm_source:attr.utm_source||undefined,
    utm_medium:attr.utm_medium||undefined,
    utm_campaign:attr.utm_campaign||undefined,
    utm_content:attr.utm_content||undefined,
    utm_term:attr.utm_term||undefined
  };
}
function trackEvent(name,payload={}){
  window.dataLayer=window.dataLayer||[];
  const context=analyticsContext();
  const eventData={
    ...Object.fromEntries(Object.entries(context).filter(([,value])=>value!==undefined)),
    ...payload
  };
  window.dataLayer.push({event:name,...eventData});
  if(window.__dakzoGa4Direct&&typeof window.gtag==="function"){
    window.gtag("event",name,eventData);
  }
}
function applyLanguage(lang,{track=false}={}){
  localStorage.setItem(storageKey,lang);
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key=el.dataset.i18n,value=translations[lang]?.[key];
    if(value)el.textContent=value;
  });
  document.querySelectorAll("[data-fr][data-en]").forEach(el=>{
    el.textContent=lang==="fr"?el.dataset.fr:el.dataset.en;
  });
  document.querySelectorAll("[data-fr-placeholder][data-en-placeholder]").forEach(el=>{
    el.setAttribute("placeholder",lang==="fr"?el.dataset.frPlaceholder:el.dataset.enPlaceholder);
  });
  document.querySelectorAll("[data-lang]").forEach(btn=>btn.classList.toggle("active",btn.dataset.lang===lang));
  if(track)trackEvent("language_switch",{language:lang,page_path:location.pathname});
}
window.Dakzo={trackEvent};

document.addEventListener("DOMContentLoaded",()=>{
  const lang=language();
  applyLanguage(lang);
  trackEvent("page_view",{language:lang,page_path:location.pathname,page_title:document.title});

  const normalizedPath=location.pathname.replace(/\/+$/,"")||"/";
  if(normalizedPath==="/pricing"){
    trackEvent("view_pricing",{language:lang,page_path:location.pathname});
  }
  if(normalizedPath==="/services"){
    trackEvent("view_service",{language:lang,page_path:location.pathname,service:"services_overview"});
  }

  const menu=document.querySelector("[data-menu-toggle]");
  const nav=document.querySelector("[data-nav]");
  menu?.addEventListener("click",()=>{
    const open=nav?.classList.toggle("open");
    menu.setAttribute("aria-expanded",String(Boolean(open)));
  });
  document.querySelectorAll("[data-lang]").forEach(btn=>btn.addEventListener("click",()=>applyLanguage(btn.dataset.lang,{track:true})));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>trackEvent(el.dataset.track,{
    language:language(),cta_location:el.dataset.location||"",service:el.dataset.service||""
  })));

  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}
    }),{threshold:.12});
    document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
  }else{
    document.querySelectorAll(".reveal").forEach(el=>el.classList.add("visible"));
  }

  const form=document.querySelector("[data-lead-form]");
  if(form)initLeadForm(form);
});

function getAttribution(){
  const params=new URLSearchParams(location.search);
  const keys=["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const saved=getStoredAttribution();
  keys.forEach(k=>{if(params.get(k))saved[k]=params.get(k)});
  try{sessionStorage.setItem("dakzo-attribution",JSON.stringify(saved))}catch{}
  return saved;
}
getAttribution();

function initLeadForm(form){
  const params=new URLSearchParams(location.search);
  const service=params.get("service");
  const allowedServices=new Set(["Website","POS","Inventory","Payroll","ERP","Custom System","Other"]);
  if(service&&allowedServices.has(service)){
    const field=form.querySelector('[name="serviceInterest"]');
    if(field)field.value=service;
  }
  if(params.get("type")==="quote"){
    const typeField=form.querySelector('[name="formType"]');
    if(typeField)typeField.value="Quote Request";
  }

  let started=false;
  form.addEventListener("input",()=>{
    if(!started){
      started=true;
      trackEvent("form_start",{language:language(),form_type:form.querySelector('[name="formType"]')?.value||"Demo Request",page_path:location.pathname});
    }
  });

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const status=form.querySelector("[data-form-status]");
    const button=form.querySelector('button[type="submit"]');
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

    if(!payload.fullName||!payload.companyName||(!payload.email&&!payload.phone)||!payload.serviceInterest||payload.businessNeed.length<20||!payload.contactConsent){
      status.textContent=language()==="fr"?"Veuillez remplir tous les champs obligatoires et fournir un email ou téléphone.":"Please complete all required fields and provide an email or phone number.";
      status.className="form-status error";
      return;
    }

    button.disabled=true;
    button.textContent=language()==="fr"?"Envoi...":"Sending...";
    try{
      const response=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Submission failed");
      status.textContent=language()==="fr"?"Merci. Votre demande a été envoyée à Dakzo.":"Thank you. Your request was sent to Dakzo.";
      status.className="form-status ok";
      trackEvent("lead_submit",{
        language:language(),
        form_type:payload.formType.toLowerCase().replaceAll(" ","_"),
        service:payload.serviceInterest,
        page_path:location.pathname
      });
      form.reset();
    }catch{
      status.textContent=language()==="fr"?"Une erreur est survenue. Réessayez ou écrivez à hello@dakzosystems.com.":"Something went wrong. Try again or email hello@dakzosystems.com.";
      status.className="form-status error";
    }finally{
      button.disabled=false;
      button.textContent=language()==="fr"?"Envoyer ma demande":"Send my request";
    }
  });
}
