(()=>{
function renderNav(){
  const nav=document.querySelector(".nav"); if(!nav)return;
  const page=location.pathname.split("/").pop()||"index.html";
  const isDash=page==="dashboard.html";
  nav.innerHTML=[
    '<a href="studio.html">Studio</a>',
    '<a href="templates.html">Templates</a>',
    '<a href="'+(isDash?"#offers":"pricing.html")+'">Offres</a>',
    '<a href="projects.html">Projets</a>',
    '<a class="primary keep" href="dashboard.html">Mon espace</a>'
  ].join("");
}
renderNav();
if(window.BFCloud?.getSession){
  window.BFCloud.getSession().then(s=>{
    const nav=document.querySelector(".nav"); if(!nav)return;
    const a=nav.querySelector('a[href="dashboard.html"]');
    if(a&&!s){a.href="account.html";a.textContent="Se connecter";}
  }).catch(()=>{
    const a=document.querySelector('.nav a[href="dashboard.html"]');if(a){a.href="account.html";a.textContent="Se connecter";}
  });
}
})();