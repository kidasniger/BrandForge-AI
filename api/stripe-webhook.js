function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data))}
module.exports=async function handler(req,res){
 if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}
 const secret=process.env.FEDAPAY_WEBHOOK_SECRET||"",supabaseUrl=process.env.SUPABASE_URL||"",service=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
 if(!supabaseUrl||!service){send(res,500,{error:"Webhook non configuré."});return}
 try{
  const event=req.body||{}; const tx=event.object||event.data||event.transaction||event; const meta=tx.custom_metadata||tx.metadata||{};
  const userId=meta.user_id, plan=meta.plan;
  if(!userId){send(res,200,{received:true,updated:false});return}
  const status=String(tx.status||tx.state||"").toLowerCase();
  if(["approved","transferred","paid","completed","approved"].includes(status)){
   const response=await fetch(supabaseUrl+"/rest/v1/profiles?id=eq."+encodeURIComponent(userId),{method:"PATCH",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({plan:plan==="business"?"business":"pro",billing_status:"active",updated_at:new Date().toISOString()})});
   if(!response.ok){send(res,500,{error:"Mise à jour Supabase échouée."});return}
  } else if(["declined","canceled","cancelled","failed"].includes(status)){
   const response=await fetch(supabaseUrl+"/rest/v1/profiles?id=eq."+encodeURIComponent(userId),{method:"PATCH",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({billing_status:"inactive",updated_at:new Date().toISOString()})});
   if(!response.ok){send(res,500,{error:"Mise à jour Supabase échouée."});return}
  }
  send(res,200,{received:true,updated:true});
 }catch(e){send(res,500,{error:"Webhook FedaPay.",details:e?.message||"Erreur inattendue"})}
};