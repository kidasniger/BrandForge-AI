(()=>{
  const $=id=>document.getElementById(id);
  function normalize(value){
    const v=String(value||"").trim(); if(!v)return "";
    try{
      const u=new URL(v);
      const id=u.pathname.split("/").filter(Boolean).reverse().find(x=>/^prd_[A-Za-z0-9_-]+$/.test(x));
      return id||"";
    }catch{return /^prd_[A-Za-z0-9_-]+$/.test(v)?v:""}
  }
  function urlFor(value){
    const v=String(value||"").trim();
    if(/^https?:\/\//i.test(v))return v;
    const id=normalize(v);
    return id?"https://ylpkposv.mychariow.market/"+id:"";
  }
  function addWidget(host,productRef){
    const productId=normalize(productRef),productUrl=urlFor(productRef);
    if(!productId){host.innerHTML="";return}
    host.innerHTML="";
    const widget=document.createElement("div");
    widget.dataset.productId=productId;
    widget.dataset.storeDomain="ylpkposv.mychariow.market";
    widget.dataset.style="tap";
    widget.dataset.borderStyle="rounded";
    widget.dataset.ctaWidth="xs";
    widget.dataset.backgroundColor="#FFFFFF";
    widget.dataset.ctaAnimation="shine";
    widget.dataset.locale="fr";
    widget.dataset.primaryColor="#ffcc00";
    host.appendChild(widget);
    if(productUrl){
      const fallback=document.createElement("a");
      fallback.className="primary chariow-fallback";
      fallback.href=productUrl;
      fallback.target="_blank";
      fallback.rel="noopener noreferrer";
      fallback.textContent="Payer maintenant";
      host.appendChild(fallback);
    }
  }
  function loadScript(){
    
    const link=document.createElement("link");
    link.id="chariow-widget-css";link.rel="stylesheet";link.href="https://js.chariowcdn.com/v1/widget.min.css";
    document.head.appendChild(link);
    const script=document.createElement("script");
    script.id="chariow-widget-script";script.src="https://js.chariowcdn.com/v1/widget.min.js";script.async=true;
    document.head.appendChild(script);
  }
  async function init(){
    const grid=$("dynamicPlans"),note=$("pricingNote");if(!grid)return;
    let plans=[];
    try{
      const client=await window.BFCloud?.getClient?.();
      if(client){
        const q=await client.from("billing_plans").select("slug,name,price_xof,chariow_product_id,active").eq("active",true).order("slug");
        if(!q.error)plans=(q.data||[]).filter(p=>p.active&&normalize(p.chariow_product_id));
      }
    }catch{}
    const session=await window.BFCloud?.getSession?.().catch(()=>null);
    grid.innerHTML="";
    if(!plans.length){
      if(note)note.textContent="Aucune offre payante n’est actuellement publiée.";
      return;
    }
    if(note)note.textContent="Les offres affichées sont celles que tu as publiées depuis l’administration.";
    for(const p of plans){
      const card=document.createElement("article");
      card.className="card price-card"+(p.slug==="pro"?" featured":"");
      card.innerHTML='<h3>'+String(p.name||p.slug)+'</h3><div class="price">'+String(p.price_xof??0)+' FCFA <small>/ mois</small></div><p>Accès aux fonctionnalités de cette offre.</p><div class="offer-widget"></div>';
      grid.appendChild(card);
      const host=card.querySelector(".offer-widget");
      if(!session){
        const login=document.createElement("a");
        login.className="primary";
        login.href="account.html?mode=signin&next="+encodeURIComponent(location.pathname.split("/").pop()+(location.hash||""));
        login.textContent="Se connecter pour payer";
        host.appendChild(login);
      }else{
        addWidget(host,p.chariow_product_id);
      }
    }
    if(session)loadScript();
  }
  document.addEventListener("DOMContentLoaded",init,{once:true});
})();