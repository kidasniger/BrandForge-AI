function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");res.end(JSON.stringify(data))}
async function jf(url,o={}){const r=await fetch(url,o),t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}return{r,d}}
async function admin(url,anon,token){const {r,d}=await jf(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});const ae=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase();return r.ok&&d?.id&&d?.email&&ae&&String(d.email).toLowerCase()===ae?d:null}
module.exports=async function(req,res){
 if(req.method==="OPTIONS"){send(res,204,{});return} if(!["GET","POST"].includes(req.method)){send(res,405,{error:"Method not allowed"});return}
 const su=process.env.SUPABASE_URL||"https://uuystjjbgjpmzptmltmr.supabase.co",an=process.env.SUPABASE_ANON_KEY||"",sv=process.env.SUPABASE_SERVICE_ROLE_KEY||"",ck=process.env.CHARIOW_API_KEY||"";
 if(!an||!sv){send(res,500,{error:"Supabase non configuré dans Vercel."});return}
 const token=String(req.headers?.authorization||"").replace(/^Bearer\s+/i,"").trim(),a=await admin(su,an,token); if(!a){send(res,403,{error:"Accès administrateur refusé."});return}
 const base=su+"/rest/v1",h={apikey:sv,Authorization:"Bearer "+sv,"Content-Type":"application/json"};
 try{
  if(req.method==="GET"){const x=await jf(base+"/billing_plans?select=slug,name,price_xof,chariow_product_id,active&order=slug",{headers:h});if(!x.r.ok)throw Error("Lecture des plans impossible.");send(res,200,{ok:true,admin:{email:a.email},chariowConfigured:Boolean(ck),plans:x.d||[]});return}
  const b=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}");
  if(b.action==="test_chariow"){if(!ck){send(res,400,{error:"CHARIOW_API_KEY manque dans Vercel."});return}const x=await jf("https://api.chariow.com/v1/store",{headers:{Authorization:"Bearer "+ck}});send(res,x.r.ok?200:502,{ok:x.r.ok,error:x.r.ok?undefined:"Clé Chariow refusée.",details:x.r.ok?undefined:(x.d?.message||x.d?.errors||x.d)});return}
  const plans=Array.isArray(b.plans)?b.plans:[]; if(plans.length!==2){send(res,400,{error:"Les plans Pro et Business sont requis."});return}
  const rows=plans.map(p=>({slug:String(p.slug||"").toLowerCase(),name:String(p.name||"").trim().slice(0,80),price_xof:Number(p.price_xof),chariow_product_id:String(p.chariow_product_id||"").trim()||null,active:p.active!==false,updated_by:a.id}));
  if(rows.some(p=>!["pro","business"].includes(p.slug)||!p.name||!Number.isInteger(p.price_xof)||p.price_xof<0||p.price_xof>1000)){send(res,400,{error:"Plans ou prix invalides. Maximum: 1 000 FCFA."});return}
  const x=await jf(base+"/billing_plans?on_conflict=slug",{method:"POST",headers:{...h,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(rows)});if(!x.r.ok)throw Error("Enregistrement impossible: "+JSON.stringify(x.d));send(res,200,{ok:true,plans:x.d||[]});
 }catch(e){send(res,500,{error:"Erreur administration.",details:e.message})}
};