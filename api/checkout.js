function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.end(JSON.stringify(data))}
module.exports=async function handler(req,res){
 if(req.method==="OPTIONS"){res.statusCode=204;res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.end();return}
 if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}
 const apiKey=process.env.FEDAPAY_SECRET_KEY||"",supabaseUrl=process.env.SUPABASE_URL||"",anon=process.env.SUPABASE_ANON_KEY||"";
 if(!apiKey||!supabaseUrl||!anon){send(res,500,{error:"FedaPay n'est pas encore configuré.",details:"Ajoute FEDAPAY_SECRET_KEY, SUPABASE_URL et SUPABASE_ANON_KEY dans Vercel."});return}
 try{
  const body=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}"),plan=String(body.plan||"").toLowerCase(),token=String(body.accessToken||"");
  const amount=plan==="pro"?5000:plan==="business"?15000:0;
  if(!amount){send(res,400,{error:"Plan inconnu."});return}
  if(!token){send(res,401,{error:"Connexion requise."});return}
  const ur=await fetch(supabaseUrl+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}}),user=await ur.json().catch(()=>({}));
  if(!ur.ok||!user?.id){send(res,401,{error:"Session invalide."});return}
  const origin="https://kidasniger.github.io/BrandForge-AI";
  const tr=await fetch("https://api.fedapay.com/v1/transactions",{
   method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({description:"BrandForge AI — abonnement "+plan,amount,currency:{iso:"XOF"},callback_url:origin+"/account.html?payment=success",customer:{firstname:user.user_metadata?.full_name||"BrandForge",email:user.email||""},custom_metadata:{user_id:user.id,plan}})
  });
  const data=await tr.json().catch(()=>({}));
  if(!tr.ok){send(res,tr.status,{error:"FedaPay API error.",details:data?.message||data?.errors||"Création du paiement impossible."});return}
  const id=data?.v1?.transaction?.id||data?.transaction?.id||data?.id;
  if(!id){send(res,502,{error:"FedaPay n'a pas renvoyé d'identifiant de transaction."});return}
  const tokenResp=await fetch("https://api.fedapay.com/v1/transactions/"+id+"/token",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"}});
  const tok=await tokenResp.json().catch(()=>({}));
  if(!tokenResp.ok){send(res,tokenResp.status,{error:"Impossible de préparer le paiement FedaPay.",details:tok?.message||tok});return}
  const paymentUrl=tok?.url||tok?.token_url||tok?.v1?.token?.url;
  if(!paymentUrl){send(res,502,{error:"URL de paiement FedaPay introuvable.",details:tok});return}
  send(res,200,{ok:true,url:paymentUrl,transactionId:id});
 }catch(e){send(res,500,{error:"Erreur checkout FedaPay.",details:e?.message||"Erreur inattendue"})}
};