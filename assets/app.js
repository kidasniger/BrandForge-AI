const API_URL="https://brandforge-ai-xi.vercel.app/api/generate";
const DEFAULT_STATE={
  name:"Niger Digital",offer:"Création de sites web, contenus et automatisations avec l’IA pour les petites entreprises.",
  goal:"Trouver plus de clients",audience:"PME et indépendants qui veulent une présence digitale moderne",
  tone:"Moderne & direct",promise:"",cta:"Demander un devis",style:"Tech minimal",region:"Afrique francophone",
  businessType:"Agence / service",template:"agency",generated:false,ai:null,projectId:null,siteEdits:{}
};
const state={...DEFAULT_STATE};
const $=id=>document.getElementById(id);
const clean=v=>String(v??"").trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const title=v=>clean(v).replace(/\s+/g," ");
const slug=v=>(clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"brandforge");

function hashText(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function palette(){
  const p=state.ai?.palette;if(Array.isArray(p)&&p.length)return p;
  const b=hashText(JSON.stringify(state))%360;
  return["hsl("+b+" 78% 64%)","hsl("+((b+28)%360)+" 82% 56%)","hsl("+((b+180)%360)+" 42% 30%)","hsl("+((b+205)%360)+" 26% 18%)","hsl("+((b+220)%360)+" 18% 10%)"];
}
function posts(){
  const p=state.ai?.posts;
  return Array.isArray(p)?p.map((x,i)=>({title:typeof x==="string"?"Post "+(i+1):(x.title||"Post "+(i+1)),text:typeof x==="string"?x:(x.text||""),type:typeof x==="string"?"Post":(x.type||"Social")})):[];
}
function saveCurrent(){localStorage.setItem("brandforge-project",JSON.stringify(state))}
function loadCurrent(){try{const s=JSON.parse(localStorage.getItem("brandforge-project")||"null");if(s)Object.assign(state,s)}catch{}}
function toast(msg){const t=$("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2400)}
function copyText(v){navigator.clipboard?.writeText(v).then(()=>toast("Copié dans le presse-papiers")).catch(()=>toast("Copie non disponible"))}
function readBrief(){
  ["name","offer","goal","audience","promise","cta","region","businessType"].forEach(k=>{if($(k))state[k]=clean($(k).value)});
  ["tone","style"].forEach(k=>{if($(k)&&$(k).value)state[k]=$(k).value});
  state.name=state.name||"Your Brand";state.offer=state.offer||"Une offre claire.";state.goal=state.goal||"Développer son activité";
  state.audience=state.audience||"Clients en recherche d’une solution moderne";state.cta=state.cta||"Demander un devis";
  state.region=state.region||"Marché local et international";state.businessType=state.businessType||"Agence / service";
}
function fillInputs(){["name","offer","goal","audience","tone","promise","cta","style","region","businessType"].forEach(k=>{if($(k)&&state[k]!=null)$(k).value=state[k]})}
async function generate(mode="full",instruction=""){
  readBrief();
  const b=$("generateBtn")||$("generateContentBtn")||$("generateGrowthBtn");
  if(b){b.disabled=true;b.textContent="Groq travaille…"}
  if($("engineStatus"))$("engineStatus").textContent="Connexion IA…";
  try{
    const r=await fetch(API_URL+"?v="+Date.now(),{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode,brief:{...state},current:state.ai||{},instruction}),cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error([d.error,d.details].filter(Boolean).join(" — ")||("Backend HTTP "+r.status));
    state.ai=d.result||state.ai||{};state.generated=true;state.projectId=state.projectId||"p_"+Date.now();saveCurrent();
    if($("engineStatus"))$("engineStatus").textContent="Groq connecté";
    if($("engineNote"))$("engineNote").textContent="Génération Groq terminée · projet sauvegardé";
    applyAll();toast(mode==="refine"?"Projet amélioré ✦":mode==="content"?"Contenu généré ✦":mode==="growth"?"Plan commercial généré ✦":"Brand générée avec Groq ✦");
    if(location.pathname.endsWith("studio.html"))location.href="brand.html";
  }catch(e){
    if($("engineStatus"))$("engineStatus").textContent="IA indisponible";
    if($("engineNote"))$("engineNote").textContent="Erreur Groq : "+(e.message||"réponse inattendue");
    toast(e.message||"Erreur de génération");
  }finally{if(b){b.disabled=false;b.textContent=b.id==="generateContentBtn"?"Générer le contenu avec Groq ✦":b.id==="generateGrowthBtn"?"Générer le plan commercial ✦":"Générer la marque avec Groq ✦"}}
}
function applyAll(){loadCurrent();fillInputs();if(!state.generated||!state.ai){renderEmpty();return}renderBrand();renderContent();renderAssets();renderSite();renderGrowth();renderProjects();renderAccount()}
function renderEmpty(){document.querySelectorAll("[data-empty-state]").forEach(x=>x.hidden=false)}
function renderBrand(){
  const r=state.ai||{},p=palette();
  const values=Array.isArray(r.values)?r.values:[];
  const set=(id,v)=>{if($(id))$(id).textContent=v||""};
  set("outName",title(state.name));set("outTagline",r.tagline||state.promise);set("outMission",r.mission);
  set("outPosition",r.positioning);set("outDifferentiation",r.differentiation);set("outAudience",state.audience);
  set("outPersonality",r.personality);set("outCta",r.cta||state.cta);set("outValuesText",values.join(" · "));
  if($("values"))$("values").innerHTML=values.map(x=>"<li>"+esc(x)+"</li>").join("")||"<li>Valeurs à préciser</li>";
  if($("swatches"))$("swatches").innerHTML=p.map(c=>'<div class="swatch" style="background:'+esc(c)+'"><span>'+esc(c)+'</span></div>').join("");
  if($("persona"))$("persona").innerHTML='<li><b>Profil</b>'+esc(r.persona||"")+'</li>'+
    (r.painPoints||[]).map(x=>"<li><b>Problème</b>"+esc(x)+"</li>").join("")+(r.desires||[]).map(x=>"<li><b>Désir</b>"+esc(x)+"</li>").join("");
}
function renderContent(){
  const r=state.ai||{};
  const map={copyTagline:r.tagline,copyPitch:r.pitch,copyBio:r.instagramBio,copyCta:r.cta||state.cta,salesScript:r.salesScript,whatsappPitch:r.whatsappPitch};
  Object.entries(map).forEach(([id,v])=>{if($(id))$(id).textContent=v||""});
  const list=$("socialList");
  if(list)list.innerHTML=posts().map((p,i)=>'<article class="post"><div class="post-top"><span>Post '+String(i+1).padStart(2,"0")+' · '+esc(p.title)+'</span><span>'+esc(p.type)+'</span></div><p>'+esc(p.text)+'</p><div class="post-actions"><button class="tiny" data-copy="'+encodeURIComponent(p.text)+'">Copier</button></div></article>').join("")||'<div class="empty"><h3>Aucun contenu</h3>Génère une marque depuis le Studio.</div>';
  if($("contentCalendar"))$("contentCalendar").innerHTML=(r.contentCalendar||[]).map(x=>'<div class="calendar-row"><b>J'+esc(x.day)+'</b><span>'+esc(x.channel)+'</span><p><strong>'+esc(x.topic)+'</strong><br>'+esc(x.hook)+'</p></div>').join("")||'<div class="empty">Le calendrier 7 jours apparaîtra après génération.</div>';
  if($("emailSequence"))$("emailSequence").innerHTML=(r.emailSequence||[]).map((x,i)=>'<article class="card"><h4>Email '+(i+1)+' · '+esc(x.subject)+'</h4><p>'+esc(x.body)+'</p></article>').join("")||"";
  if($("faq"))$("faq").innerHTML=(r.faq||[]).map(x=>'<article class="card"><h4>'+esc(x.question)+'</h4><p>'+esc(x.answer)+'</p></article>').join("")||"";
}
function logoSvg(){
  const p=palette(),name=title(state.name)||"Your Brand",short=(name.replace(/[^A-Za-zÀ-ÿ0-9]/g,"").slice(0,2)||"BF").toUpperCase();
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 260"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="'+esc(p[0])+'"/><stop offset="1" stop-color="'+esc(p[1]||p[0])+'"/></linearGradient></defs><rect width="900" height="260" rx="36" fill="#0b0d12"/><rect x="70" y="65" width="130" height="130" rx="34" fill="url(#g)"/><text x="135" y="150" text-anchor="middle" font-family="Arial" font-size="54" font-weight="800" fill="#fff">'+esc(short)+'</text><text x="245" y="132" font-family="Arial" font-size="58" font-weight="800" fill="#fff">'+esc(name)+'</text><text x="248" y="172" font-family="Arial" font-size="18" fill="#aab2c2">Brand system · BrandForge AI</text></svg>';
}
function socialSvg(p,i){
  const pal=palette(),bg=pal[i%pal.length]||"#111827",name=title(state.name)||"Your Brand",lines=[];let line="";
  String(p.text||"").split(/\s+/).forEach(w=>{if((line+" "+w).trim().length>28){lines.push(line.trim());line=w}else line+=(line?" ":"")+w});if(line)lines.push(line.trim());
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><defs><linearGradient id="sg'+i+'" x1="0" x2="1" y1="0" y2="1"><stop stop-color="'+esc(bg)+'"/><stop offset="1" stop-color="'+esc(pal[(i+1)%pal.length])+'"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#sg'+i+')"/><text x="82" y="100" font-family="Arial" font-size="30" font-weight="700" fill="rgba(255,255,255,.84)">'+esc(name)+'</text><text x="82" y="190" font-family="Arial" font-size="28" font-weight="700" fill="rgba(255,255,255,.65)">0'+(i+1)+' · '+esc(p.title)+'</text>'+lines.slice(0,7).map((x,j)=>'<text x="82" y="'+(350+j*80)+'" font-family="Arial" font-size="'+(j===0?56:50)+'" font-weight="800" fill="#fff">'+esc(x)+'</text>').join("")+'<text x="82" y="990" font-family="Arial" font-size="24" fill="rgba(255,255,255,.72)">'+esc(state.cta)+'</text></svg>';
}
function renderAssets(){
  if($("logoStage"))$("logoStage").innerHTML=logoSvg();
  if($("visualGrid"))$("visualGrid").innerHTML=posts().slice(0,3).map((p,i)=>'<article class="visual"><div>'+socialSvg(p,i)+'</div><div class="visual-actions"><button class="tiny" data-svg="'+i+'">SVG</button><button class="tiny" data-png="'+i+'">PNG</button></div></article>').join("")||'<div class="empty" style="grid-column:1/-1">Génère une marque pour créer tes visuels.</div>';
}
function renderSite(){
  const r=state.ai||{},ed=state.siteEdits||{};if(!$("siteHeadline"))return;
  $("siteLogo").textContent=title(state.name);$("siteBadge").textContent=state.region;
  $("siteHeadline").textContent=ed.headline||r.landingHeadline||r.tagline||state.promise||"";
  $("siteDescription").textContent=ed.description||r.landingDescription||state.offer;$("siteCta").textContent=ed.cta||r.cta||state.cta;
  if($("siteEditHeadline"))$("siteEditHeadline").value=$("siteHeadline").textContent;
  if($("siteEditDescription"))$("siteEditDescription").value=$("siteDescription").textContent;
  if($("siteEditCta"))$("siteEditCta").value=$("siteCta").textContent;
  if($("siteSections"))$("siteSections").innerHTML=(r.siteSections||[]).map(x=>'<div class="site-mini"><b>'+esc(x.title)+'</b><span>'+esc(x.body)+'</span></div>').join("");
}
function renderGrowth(){
  const r=state.ai||{};
  if($("offerIdeas"))$("offerIdeas").innerHTML=(r.offerIdeas||[]).map(x=>'<article class="card"><h4>'+esc(x.name||"Offre")+'</h4><p>'+esc(x.description||"")+'</p><p><strong>Idée de prix :</strong> '+esc(x.priceIdea||"À définir")+'</p></article>').join("")||'<div class="empty">Génère le plan commercial dans cette page.</div>';
  if($("keywords"))$("keywords").innerHTML=(r.keywords||[]).map(x=>"<li>"+esc(x)+"</li>").join("")||"<li>Les mots-clés apparaîtront après génération.</li>";
}
async function renderProjects(){
  const el=$("projectList");if(!el)return;
  let all=JSON.parse(localStorage.getItem("brandforge-projects")||"[]");
  if(window.BFCloud){
    try{
      const cloud=await window.BFCloud.listProjects();
      const map=new Map(all.map(p=>[p.projectId,p]));
      cloud.forEach(p=>map.set(p.projectId,{...map.get(p.projectId),...p,cloud:true}));
      all=[...map.values()].sort((a,b)=>new Date(b.savedAt||0)-new Date(a.savedAt||0));
      localStorage.setItem("brandforge-projects",JSON.stringify(all.slice(0,50)));
    }catch{}
  }
  if(!all.length){el.innerHTML='<div class="empty" style="grid-column:1/-1"><h3>Aucun projet</h3>Crée une marque dans Studio pour commencer.</div>';return}
  el.innerHTML=all.map(p=>'<article class="project-card"><h3>'+esc(p.name||"Projet")+'</h3><p>'+esc(p.businessType||"")+' · '+esc(p.region||"")+'</p><p>'+esc((p.offer||"").slice(0,120))+'</p><p class="muted">'+(p.cloud?"☁ Synchronisé":"Appareil")+'</p><div class="asset-actions"><button class="secondary" data-load="'+esc(p.projectId)+'">Ouvrir</button><button class="tiny danger" data-delete="'+esc(p.projectId)+'">Supprimer</button></div></article>').join("");
}
async function saveProject(){
  readBrief();
  const all=JSON.parse(localStorage.getItem("brandforge-projects")||"[]");
  const id=state.projectId||"p_"+Date.now();state.projectId=id;
  const snap={...state,savedAt:new Date().toISOString()};
  const i=all.findIndex(x=>x.projectId===id);if(i>=0)all[i]=snap;else all.unshift(snap);
  localStorage.setItem("brandforge-projects",JSON.stringify(all.slice(0,50)));saveCurrent();renderProjects();toast("Projet enregistré localement");
  try{
    if(window.BFCloud){
      const cloudId=await window.BFCloud.upsertProject(state);
      if(cloudId){state.projectId=cloudId;saveCurrent();toast("Projet synchronisé dans le cloud");renderProjects();}
    }
  }catch(e){toast("Cloud non synchronisé : "+(e.message||"erreur"))}
}
async function loadProject(id){
  let all=JSON.parse(localStorage.getItem("brandforge-projects")||"[]"),p=all.find(x=>x.projectId===id);
  if(!p&&window.BFCloud){try{all=await window.BFCloud.listProjects();p=all.find(x=>x.projectId===id)}catch{}}
  if(!p)return;Object.assign(state,DEFAULT_STATE,p);saveCurrent();location.href="brand.html"
}
async function deleteProject(id){
  const all=JSON.parse(localStorage.getItem("brandforge-projects")||"[]").filter(p=>p.projectId!==id);
  localStorage.setItem("brandforge-projects",JSON.stringify(all));
  try{if(window.BFCloud)await window.BFCloud.deleteProject(id)}catch(e){toast("Suppression cloud échouée")}
  renderProjects();toast("Projet supprimé");
}
function downloadBlob(content,name,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),600)}
function downloadSvg(svg,name){downloadBlob(svg,name,"image/svg+xml;charset=utf-8")}
function downloadPng(svg,name,w,h){
  const img=new Image(),u=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  img.onload=()=>{const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);c.toBlob(b=>{if(b)downloadBlob(b,name,"image/png");URL.revokeObjectURL(u)})};
  img.onerror=()=>{URL.revokeObjectURL(u);toast("PNG indisponible — utilise SVG")};img.src=u;
}
function pdfReport(){
  loadCurrent();const r=state.ai||{},ps=posts(),win=window.open("","_blank");if(!win){toast("Autorise les pop-ups pour exporter");return}
  win.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(state.name)+' — BrandForge</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 25px;color:#111827}h1{font-size:38px}h2{margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:7px}p{line-height:1.55;color:#475569}.sw{display:flex;gap:7px}.c{width:60px;height:32px;border-radius:7px}.post{padding:10px;border:1px solid #ddd;border-radius:8px;margin:7px 0}</style></head><body><small>BrandForge AI · kit de lancement</small><h1>'+esc(state.name)+'</h1><p><strong>'+esc(r.tagline||"")+'</strong></p><h2>Mission</h2><p>'+esc(r.mission||"")+'</p><h2>Positionnement</h2><p>'+esc(r.positioning||"")+'</p><p><strong>Différenciation :</strong> '+esc(r.differentiation||"")+'</p><p><strong>Audience :</strong> '+esc(state.audience)+'</p><h2>Palette</h2><div class="sw">'+palette().map(c=>'<div class="c" style="background:'+esc(c)+'"></div>').join("")+'</div><h2>Copy</h2><p>'+esc(r.pitch||"")+'</p><p>'+esc(r.instagramBio||"")+'</p><h2>Social</h2>'+ps.map(x=>'<div class="post"><strong>'+esc(x.title)+'</strong><p>'+esc(x.text)+'</p></div>').join("")+'<h2>Landing page</h2><p><strong>'+esc(r.landingHeadline||"")+'</strong></p><p>'+esc(r.landingDescription||state.offer)+'</p><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>');win.document.close();toast("Rapport prêt à enregistrer en PDF");
}
function downloadableSite(){
  loadCurrent();const r=state.ai||{},p=palette(),name=title(state.name)||"Your Brand",ed=state.siteEdits||{};
  const sections=r.siteSections||[];const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(name)+'</title><meta name="description" content="'+esc(r.seoDescription||r.landingDescription||state.offer)+'"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111827;background:#f8fafc}.wrap{max-width:1100px;margin:auto;padding:24px}.nav{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0}.logo{font-weight:900}.hero{padding:90px 0}.badge{display:inline-block;border:1px solid #dbeafe;border-radius:999px;padding:7px 10px;color:#475569;font-size:12px}.hero h1{font-size:clamp(44px,7vw,78px);line-height:.98;max-width:850px}.hero p{font-size:18px;max-width:700px;color:#475569}.cta{display:inline-block;background:'+esc(p[0])+';color:#fff;padding:13px 16px;border-radius:11px;font-weight:800}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:35px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px}.card span{display:block;color:#64748b;margin-top:5px;font-size:13px}@media(max-width:760px){.cards{grid-template-columns:1fr}}</style></head><body><div class="wrap"><nav class="nav"><div class="logo">'+esc(name)+'</div><div>'+esc(state.region)+'</div></nav><main class="hero"><span class="badge">'+esc(state.region)+'</span><h1>'+esc(ed.headline||r.landingHeadline||r.tagline||state.promise)+'</h1><p>'+esc(ed.description||r.landingDescription||state.offer)+'</p><a class="cta" href="#contact">'+esc(ed.cta||r.cta||state.cta)+'</a><div class="cards">'+sections.slice(0,3).map(x=>'<div class="card"><b>'+esc(x.title)+'</b><span>'+esc(x.body)+'</span></div>').join("")+'</div></main></div></body></html>';
  downloadBlob(html,slug(name)+"-site.html","text/html;charset=utf-8");toast("Site HTML téléchargé");
}
function saveSiteEdits(){state.siteEdits={headline:clean($("siteEditHeadline")?.value),description:clean($("siteEditDescription")?.value),cta:clean($("siteEditCta")?.value)};saveCurrent();renderSite();toast("Site mis à jour")}
function renderAccount(){
  if($("accountName"))$("accountName").textContent=state.name||"Invité";
  if($("accountProjects"))$("accountProjects").textContent=JSON.parse(localStorage.getItem("brandforge-projects")||"[]").length;
}
const templates={
  restaurant:{name:"Nova Table",businessType:"Restaurant / food",offer:"Restaurant urbain proposant une cuisine moderne avec réservation en ligne.",goal:"Augmenter les réservations",audience:"Actifs urbains, couples et groupes d’amis",tone:"Chaleureux & humain",promise:"Une expérience gourmande qui donne envie de revenir.",cta:"Réserver une table",style:"Editorial premium",region:"Ville + diaspora"},
  ecommerce:{name:"Luma Market",businessType:"E-commerce",offer:"Boutique en ligne de produits pratiques, bien présentés et faciles à commander.",goal:"Augmenter les ventes",audience:"Acheteurs mobiles qui recherchent simplicité et confiance",tone:"Moderne & direct",promise:"Découvre des produits utiles, choisis simplement.",cta:"Découvrir la boutique",style:"Coloré & startup",region:"International"},
  coach:{name:"Pulse Coach",businessType:"Coach / consultant",offer:"Accompagnement personnalisé pour aider des professionnels à obtenir des résultats mesurables.",goal:"Obtenir des prospects qualifiés",audience:"Professionnels qui veulent structurer leur croissance",tone:"Premium & élégant",promise:"Un accompagnement clair, adapté à ton objectif.",cta:"Réserver un appel",style:"Sobre & corporate",region:"Francophone"},
  agency:{...DEFAULT_STATE}
};
function applyTemplate(key){const t=templates[key];if(!t)return;Object.assign(state,DEFAULT_STATE,t,{template:key,generated:false,ai:null,projectId:null,siteEdits:{}});saveCurrent();location.href="studio.html"}
function renderTemplates(){
  const el=$("templateList");if(!el)return;
  el.innerHTML=Object.entries(templates).map(([k,t])=>'<article class="feature template-card"><div class="feature-icon">✦</div><h3>'+esc(t.name)+'</h3><p>'+esc(t.businessType)+' · '+esc(t.goal)+'</p><div class="asset-actions"><button class="primary" data-template="'+k+'">Utiliser ce modèle</button></div></article>').join("");
}
async function renderPricing(){
  const el=$("pricingNote");if(el)el.textContent="Paiement via Chariow. Les prix sont gérés depuis l’administration.";
  try{
    const r=await fetch("https://brandforge-ai-xi.vercel.app/api/billing-config?ts="+Date.now(),{cache:"no-store"});
    const d=await r.json();const map=Object.fromEntries((d.plans||[]).map(p=>[p.slug,p]));
    const pro=map.pro,business=map.business;
    if(pro&&$("pricePro"))$("pricePro").innerHTML=esc(String(pro.price_xof))+" FCFA <small>/ mois</small>";
    if(business&&$("priceBusiness"))$("priceBusiness").innerHTML=esc(String(business.price_xof))+" FCFA <small>/ mois</small>";
    if(pro&&$("accountProPrice"))$("accountProPrice").textContent=String(pro.price_xof)+" FCFA";
    if(business&&$("accountBusinessPrice"))$("accountBusinessPrice").textContent=String(business.price_xof)+" FCFA";
  }catch{}
}
async function setupAccount(){
  if(!$("authStatus"))return;
  if(!window.BFCloud){$("authStatus").textContent="Mode local — connecte Supabase pour activer les comptes.";return}
  try{
    const user=await window.BFCloud.getUser();
    const status=$("authStatus"),out=$("accountName"),signout=$("signoutBtn");
    if(user){
      const meta=user.user_metadata||{};
      if($("authName"))$("authName").value=meta.full_name||"";
      if($("authPhone"))$("authPhone").value=meta.phone||"";
      if($("authCountry"))$("authCountry").value=meta.country_code||"NE";
      if($("checkoutPhone"))$("checkoutPhone").value=meta.phone||"";
      if($("checkoutCountry"))$("checkoutCountry").value=meta.country_code||"NE";
      status.textContent="Connecté · "+(user.email||"");
      if(out)out.textContent=user.user_metadata?.full_name||user.email||"Compte";
      if(signout)signout.style.display="block";
      try{
        const profile=await window.BFCloud.getProfile();
        if($("planState"))$("planState").textContent="Plan "+(profile?.plan||"free")+" · "+(profile?.billing_status||"inactive");
      }catch{}
      const local=JSON.parse(localStorage.getItem("brandforge-projects")||"[]");
      const el=$("accountProjects");if(el)el.textContent=local.length;
      const cloudState=$("cloudState");if(cloudState)cloudState.textContent="Compte connecté. Les projets enregistrés sont synchronisés lorsque tu les sauvegardes.";
    }else{
      status.textContent="Pas encore connecté.";
      if(signout)signout.style.display="none";
    }
  }catch(e){$("authStatus").textContent="Cloud configuré mais indisponible : "+(e.message||"erreur")}
}
async function authSignup(){
  try{const d=await window.BFCloud.signUp(clean($("authEmail").value),$("authPassword").value,clean($("authName").value),clean($("authPhone")?.value),clean($("authCountry")?.value)||"NE");toast(d.session?"Compte créé et connecté":"Compte créé — vérifie ton email");await setupAccount()}catch(e){toast(e.message||"Inscription impossible")}
}
async function authSignin(){try{await window.BFCloud.signIn(clean($("authEmail").value),$("authPassword").value);toast("Connexion réussie");await setupAccount();renderProjects()}catch(e){toast(e.message||"Connexion impossible")}}
async function authSignout(){try{await window.BFCloud.signOut();toast("Déconnexion réussie");await setupAccount()}catch(e){toast(e.message||"Déconnexion impossible")}}
function setupCheckoutLinks(){
  document.querySelectorAll("[data-plan]").forEach(a=>a.addEventListener("click",async e=>{
    e.preventDefault();
    try{
      const phone=clean($("checkoutPhone")?.value||$("authPhone")?.value);
      const countryCode=clean($("checkoutCountry")?.value||$("authCountry")?.value)||"NE";
      if(!phone){
        $("checkoutPhone")?.focus();
        toast("Ajoute ton numéro de téléphone pour continuer.");
        return;
      }
      if(window.BFCloud?.updateContact) await window.BFCloud.updateContact(phone,countryCode);
      await window.BFCloud.checkout(a.dataset.plan,phone,countryCode);
    }catch(err){toast(err.message||"Checkout indisponible")}
  }));
}
function setup(){
  loadCurrent();fillInputs();renderTemplates();applyAll();renderPricing();setupAccount();
  if($("generateBtn"))$("generateBtn").addEventListener("click",()=>generate("full"));
  if($("generateContentBtn"))$("generateContentBtn").addEventListener("click",()=>generate("content"));
  if($("generateGrowthBtn"))$("generateGrowthBtn").addEventListener("click",()=>generate("growth"));
  if($("refineBtn"))$("refineBtn").addEventListener("click",()=>{const instruction=clean($("refineInstruction")?.value)||"Rends le positionnement et le message plus clairs et plus différenciants.";generate("refine",instruction)});
  if($("exportPdf"))$("exportPdf").addEventListener("click",pdfReport);
  if($("saveProject"))$("saveProject").addEventListener("click",saveProject);
  if($("downloadLogoSvg"))$("downloadLogoSvg").addEventListener("click",()=>downloadSvg(logoSvg(),slug(state.name)+"-logo.svg"));
  if($("downloadLogoPng"))$("downloadLogoPng").addEventListener("click",()=>downloadPng(logoSvg(),slug(state.name)+"-logo.png",1800,520));
  if($("downloadSite"))$("downloadSite").addEventListener("click",downloadableSite);
  if($("saveSiteEdits"))$("saveSiteEdits").addEventListener("click",saveSiteEdits);
  if($("signupBtn"))$("signupBtn").addEventListener("click",authSignup);
  if($("signinBtn"))$("signinBtn").addEventListener("click",authSignin);
  if($("signoutBtn"))$("signoutBtn").addEventListener("click",authSignout);
  setupCheckoutLinks();
  if(location.search.includes("checkout=success"))toast("Paiement terminé — Chariow va confirmer la vente et synchroniser ton plan.");
  const health=$("health");if(health)fetch(API_URL+"?health=1",{cache:"no-store"}).then(r=>r.json()).then(d=>health.textContent=d.configured?"Groq connecté":"Clé Groq manquante").catch(()=>health.textContent="Backend indisponible");
  document.addEventListener("click",e=>{
    const c=e.target.closest("[data-copy]");if(c){const el=document.getElementById(c.dataset.copy);copyText(el?el.textContent:decodeURIComponent(c.dataset.copy))}
    const s=e.target.closest("[data-svg]");if(s){const i=Number(s.dataset.svg);if(posts()[i])downloadSvg(socialSvg(posts()[i],i),slug(state.name)+"-social-"+(i+1)+".svg")}
    const p=e.target.closest("[data-png]");if(p){const i=Number(p.dataset.png);if(posts()[i])downloadPng(socialSvg(posts()[i],i),slug(state.name)+"-social-"+(i+1)+".png",1080,1080)}
    const l=e.target.closest("[data-load]");if(l)loadProject(l.dataset.load);
    const d=e.target.closest("[data-delete]");if(d&&confirm("Supprimer ce projet ?"))deleteProject(d.dataset.delete);
    const t=e.target.closest("[data-template]");if(t)applyTemplate(t.dataset.template);
  });
}
document.addEventListener("DOMContentLoaded",setup);
