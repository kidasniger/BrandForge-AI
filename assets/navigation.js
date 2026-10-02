(()=>{
  const page=location.pathname.split("/").pop()||"index.html";
  const isAdmin=page==="admin.html";
  const isDashboard=page==="dashboard.html";
  const privatePages=new Set(["studio.html","brand.html","content.html","assets.html","site.html","growth.html","projects.html","templates.html","dashboard.html"]);
  const items=[
    ["studio.html","Studio"],
    ["brand.html","Marque"],
    ["content.html","Contenu"],
    ["assets.html","Assets"],
    ["growth.html","Croissance"],
    ["site.html","Site"],
    ["templates.html","Templates"],
    ["projects.html","Projets"],
    [isDashboard?"#offers":"pricing.html","Offres"],
    ["dashboard.html","Mon espace"]
  ];
  const style=document.createElement("style");
  style.textContent=`
    .topbar{gap:18px}
    .topbar .nav{display:flex!important;align-items:center;gap:5px;flex:1;min-width:0;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;justify-content:flex-end;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .topbar .nav::-webkit-scrollbar{display:none}
    .topbar .nav a{display:inline-flex!important;align-items:center;flex:0 0 auto;white-space:nowrap;font-size:14px;padding:9px 11px;line-height:1.2}
    .topbar .nav a.active{border-color:#4a3a72;background:rgba(139,92,246,.12);color:#efe9ff}
    .topbar .nav a.primary{color:#fff}
    @media(max-width:920px){
      .topbar{height:auto;min-height:74px;flex-wrap:wrap;padding:8px 0}
      .topbar .nav{flex-basis:100%;width:100%;justify-content:flex-start;padding:2px 0 5px}
    }
    @media(max-width:520px){.topbar .nav a{min-width:fit-content}
      .topbar .nav a{font-size:13px;padding:9px 10px}
    }
  `;
  document.head.appendChild(style);
  async function render(){
    const nav=document.querySelector(".nav"); if(!nav)return;
    let session=null;
    try{session=window.BFCloud?await window.BFCloud.getSession():null}catch{}
    const logged=!!session;
    const visible=items.map(([href,label])=>({href,label}));
    const offer=visible.find(x=>x.label==="Offres");
    if(offer) offer.href=logged?(isDashboard?"#offers":"dashboard.html#offers"):"pricing.html";
    const space=visible.find(x=>x.label==="Mon espace");
    if(space){space.href=logged?"dashboard.html":"account.html";space.label=logged?"Mon espace":"Se connecter"}
    const html=visible.map(x=>{
      const active=(x.href.startsWith("#")?isDashboard:page===x.href.split("#")[0]);
      const cls=x.label==="Mon espace"&&logged?"primary keep":(active?"active":"");
      return '<a class="'+cls+'" href="'+x.href+'">'+x.label+'</a>';
    });
    if(isAdmin)html.push('<a class="active" href="admin.html">Administration</a>');
    nav.innerHTML=html.join("");
    document.querySelectorAll('link[rel*="icon"]').forEach(el=>el.remove());
    document.head.insertAdjacentHTML("beforeend",
      '<link id="bf-favicon-png" rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png?v=13">'+
      '<link id="bf-apple-icon" rel="apple-touch-icon" sizes="32x32" href="assets/favicon-32.png?v=13">'
    );
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();