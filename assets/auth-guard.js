(()=>{
  document.documentElement.classList.add("auth-pending");
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