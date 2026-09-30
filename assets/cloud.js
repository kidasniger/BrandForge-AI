(() => {
  let client = null;
  let configPromise = null;

  async function loadClient(){
    if(client) return client;
    if(configPromise) return configPromise;
    configPromise = (async()=>{
      if(!window.supabase) return null;
      try{
        const response = await fetch("https://brandforge-ai-xi.vercel.app/api/config?ts="+Date.now(), {cache:"no-store"});
        const cfg = await response.json();
        if(!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
        client = window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
          auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
        });
        return client;
      }catch{return null}
    })();
    return configPromise;
  }

  async function getClient(){return loadClient()}
  async function getSession(){
    const c=await loadClient();
    if(!c) return null;
    const {data}=await c.auth.getSession();
    return data?.session||null;
  }
  async function getUser(){
    const c=await loadClient();
    if(!c) return null;
    const {data}=await c.auth.getUser();
    return data?.user||null;
  }
  async function signIn(email,password){
    const c=await loadClient();
    if(!c) throw new Error("Cloud non configuré.");
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error) throw error;
    return data;
  }
  async function signUp(email,password,fullName){
    const c=await loadClient();
    if(!c) throw new Error("Cloud non configuré.");
    const {data,error}=await c.auth.signUp({
      email,password,
      options:{data:{full_name:fullName||""},emailRedirectTo:location.origin+"/account.html"}
    });
    if(error) throw error;
    return data;
  }
  async function signOut(){
    const c=await loadClient();
    if(c) await c.auth.signOut();
  }
  async function listProjects(){
    const c=await loadClient(), user=await getUser();
    if(!c||!user) return [];
    const {data,error}=await c.from("projects").select("*").order("updated_at",{ascending:false});
    if(error) throw error;
    return (data||[]).map(row=>({
      projectId:row.id,name:row.name,...(row.brief||{}),ai:row.ai||null,siteEdits:row.site_edits||{},
      generated:true,cloud:true,savedAt:row.updated_at
    }));
  }
  async function upsertProject(project){
    const c=await loadClient(), user=await getUser();
    if(!c||!user) return null;
    const payload={
      id:project.projectId&&/^[0-9a-f-]{36}$/i.test(project.projectId)?project.projectId:undefined,
      user_id:user.id,name:project.name||"Projet",
      brief:{name:project.name,offer:project.offer,goal:project.goal,audience:project.audience,tone:project.tone,promise:project.promise,cta:project.cta,style:project.style,region:project.region,businessType:project.businessType,template:project.template},
      ai:project.ai||{},site_edits:project.siteEdits||{},template:project.template||null,updated_at:new Date().toISOString()
    };
    if(!payload.id) delete payload.id;
    const {data,error}=await c.from("projects").upsert(payload,{onConflict:"id"}).select().single();
    if(error) throw error;
    return data?.id||null;
  }
  async function deleteProject(id){
    const c=await loadClient(); if(!c) return;
    if(!/^[0-9a-f-]{36}$/i.test(String(id))) return;
    const {error}=await c.from("projects").delete().eq("id",id);
    if(error) throw error;
  }
  async function checkout(plan){
    const session=await getSession();
    if(!session) throw new Error("Connecte-toi avant de choisir un abonnement.");
    const response=await fetch("https://brandforge-ai-xi.vercel.app/api/checkout",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({plan,accessToken:session.access_token})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok) throw new Error([data.error,data.details].filter(Boolean).join(" — ")||"Checkout indisponible.");
    location.href=data.url;
  }

  window.BFCloud={getClient,getSession,getUser,signIn,signUp,signOut,listProjects,upsertProject,deleteProject,checkout};
})();