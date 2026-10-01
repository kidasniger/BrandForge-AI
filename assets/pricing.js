(()=>{
const $=id=>document.getElementById(id);
function normalize(v){
  const x=String(v||"").trim(); if(!x)return "";
  try{
    const u=new URL(x);
    const p=u.pathname.split("/").filter(Boolean).reverse().find(s=>/^prd_[A-Za-z0-9_-]+$/.test(s));
    return p||x;
  }catch{return x}
}
function widget(hostId,ref,logged){
  const host=$(hostId);if(!host)return;
  host.innerHTML="";
  const id=normalize(ref);
  if(!logged){host.innerHTML='<a class="primary" href="account.html?mode=signin&next=pricing.html">Se connecter pour continuer</a>';return}
  if(!id){host.innerHTML='<span class="muted">Offre non publiée.</span>';return}
  const el=document.createElement("div");
  el.dataset.productId=id;
  el.dataset.storeDomain="ylpkposv.mychariow.market";
  el.dataset.style="tap";el.dataset.borderStyle="rounded";el.dataset.ctaWidth="xs";
  el.dataset.backgroundColor="#FFFFFF";el.dataset.ctaAnimation="shine";el.dataset.locale="fr";el.dataset.primaryColor="#ffcc00";
  host.appendChild(el);
  if(!document.getElementById("chariow-widget-css")){
    const l=document.createElement("link");l.id="chariow-widget-css";l.rel="stylesheet";l.href="https://js.chariowcdn.com/v1/widget.min.css";document.head.appendChild(l)
  }
  if(!document.getElementById("chariow-widget-script")){
    const s=document.createElement("script");s.id="chariow-widget-script";s.src="https://js.chariowcdn.com/v1/widget.min.js";s.async=true;document.head.appendChild(s)
  }
}
async function init(){
  const grid=$("dynamicPlans"),note=$("pricingNote");if(!grid)return;
  let plans=[];
  try{
    const c=await window.BFCloud.getClient();
    if(c){const q=await c.from("billing_plans").select("slug,name,price_xof,chariow_product_id,active").eq("active",true).order("slug");if(!q.error)plans=q.data||[]}
  }catch{}
  const session=await window.BFCloud.getSession().catch(()=>null);
  grid.innerHTML="";
  if(!plans.length){
    note.textContent="Aucune offre payante n’est actuellement publiée.";
    return;
  }
  note.textContent="Choisis ton offre et accède à ton espace.";
  for(const p of plans){
    const article=document.createElement("article");article.className="card price-card"+(p.slug==="pro"?" featured":"");
    article.innerHTML='<h3>'+String(p.name||p.slug)+'</h3><div class="price">'+String(p.price_xof)+' FCFA <small>/ mois</small></div><p>Accès aux fonctionnalités proposées pour cette offre.</p><div class="offer-widget"></div>';
    grid.appendChild(article);
    widget(article.querySelector(".offer-widget"),p.chariow_product_id,!!session);
  }
}
document.addEventListener("DOMContentLoaded",init);
})();