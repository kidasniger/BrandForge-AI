function send(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.end(JSON.stringify(data));
}

async function jsonFetch(url,options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let data=null;try{data=text?JSON.parse(text):null}catch{}
  return {r,data};
}

async function getAdminUser(supabaseUrl,anon,token){
  if(!token) return null;
  const {r,data}=await jsonFetch(supabaseUrl+"/auth/v1/user",{
    headers:{apikey:anon,Authorization:"Bearer "+token}
  });
  if(!r.ok||!data?.id||!data?.email) return null;
  const adminEmail=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
  if(!adminEmail||String(data.email).toLowerCase()!==adminEmail) return null;
  return data;
}

async function supabaseRows(supabaseUrl,service,method,body){
  return jsonFetch(supabaseUrl+"/rest/v1/billing_plans"+(method==="GET"?"?select=slug,name,price_xof,chariow_product_id,active&order=slug":""),{
    method,
    headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:method==="GET"?"return=representation":"resolution=merge-duplicates,return=representation"},
    body:method==="GET"?undefined:JSON.stringify(body)
  });
}

module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){send(res,204,{});return}
  if(req.method!=="GET"&&req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}

  const supabaseUrl=process.env.SUPABASE_URL||"";
  const anon=process.env.SUPABASE_ANON_KEY||"";
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  const chariowKey=process.env.CHARIOW_API_KEY||"";
  if(!supabaseUrl||!anon||!service){send(res,500,{error:"Supabase admin non configuré."});return}

  try{
    const token=String(req.headers?.authorization||"").replace(/^Bearer\s+/i,"").trim();
    const admin=await getAdminUser(supabaseUrl,anon,token);
    if(!admin){send(res,403,{error:"Accès administrateur refusé."});return}

    if(req.method==="GET"){
      const {r,data}=await supabaseRows(supabaseUrl,service,"GET");
      if(!r.ok){send(res,500,{error:"Impossible de lire les plans.",details:data});return}
      send(res,200,{ok:true,admin:{email:admin.email},chariowConfigured:Boolean(chariowKey),plans:data?.data||data||[]});
      return;
    }

    const body=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}");
    if(body.action==="test_chariow"){
      if(!chariowKey){send(res,400,{error:"CHARIOW_API_KEY manque dans Vercel."});return}
      const {r,data}=await jsonFetch("https://api.chariow.com/v1/store",{headers:{Authorization:"Bearer "+chariowKey}});
      send(res,r.ok?200:502,{ok:r.ok,error:r.ok?undefined:"Clé Chariow refusée.",store:r.ok?(data?.data||data):undefined,details:r.ok?undefined:(data?.message||data?.errors||data)});
      return;
    }

    const plans=Array.isArray(body.plans)?body.plans:[];
    if(!plans.length){send(res,400,{error:"Aucun plan à enregistrer."});return}
    const normalized=plans.map(p=>({
      slug:String(p.slug||"").toLowerCase(),
      name:String(p.name||"").trim().slice(0,80),
      price_xof:Number(p.price_xof),
      chariow_product_id:String(p.chariow_product_id||"").trim().slice(0,150)||null,
      active:p.active!==false,
      updated_by:admin.id
    }));
    if(normalized.some(p=>!["pro","business"].includes(p.slug))) {send(res,400,{error:"Plan invalide."});return}
    if(normalized.some(p=>!p.name||!Number.isInteger(p.price_xof)||p.price_xof<0||p.price_xof>1000)) {send(res,400,{error:"Chaque prix doit être un entier entre 0 et 1 000 FCFA."});return}

    const {r,data}=await supabaseRows(supabaseUrl,service,"POST",normalized);
    if(!r.ok){send(res,500,{error:"Enregistrement des plans impossible.",details:data?.message||data?.errors||data});return}
    send(res,200,{ok:true,plans:data?.data||data||[]});
  }catch(e){send(res,500,{error:"Erreur administration.",details:e?.message||"Erreur inattendue"});}
};
