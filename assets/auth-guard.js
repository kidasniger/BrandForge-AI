(()=>{
  document.documentElement.classList.add("auth-pending");
  if(!document.getElementById("bf-favicon")){document.head.insertAdjacentHTML("beforeend",'<link id="bf-favicon" rel="icon" type="image/svg+xml" href="brandforge-icon.svg?v=4"><link rel="apple-touch-icon" href="brandforge-icon.svg?v=4">')}
  const file=location.pathname.split("/").pop()||"index.html";
  const next=file+(location.search||"")+(location.hash||"");
  const toLogin=()=>location.replace("account.html?next="+encodeURIComponent(next));
  window.__BF_AUTH_READY=(async()=>{
    try{
      if(!window.BFCloud) return toLogin();
      const session=await window.BFCloud.getSession();
      if(!session) return toLogin();
      const user=await window.BFCloud.getUser();
      if(!user?.id) return toLogin();
      window.__BF_USER_ID=user.id;
      document.documentElement.classList.remove("auth-pending");
      return user;
    }catch{
      return toLogin();
    }
  })();
})();