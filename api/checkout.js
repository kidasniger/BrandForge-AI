function send(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
  res.end(JSON.stringify(data));
}
module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.statusCode=204;res.end();return}
  if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}
  const secret=process.env.STRIPE_SECRET_KEY||"",supabaseUrl=process.env.SUPABASE_URL||"",anon=process.env.SUPABASE_ANON_KEY||"";
  if(!secret||!supabaseUrl||!anon){send(res,500,{error:"Checkout is not fully configured.",details:"Configure STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY and Stripe price IDs in Vercel."});return}
  try{
    const body=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}");
    const plan=String(body.plan||"").toLowerCase(),token=String(body.accessToken||"");
    const priceId=plan==="pro"?process.env.STRIPE_PRICE_PRO:plan==="business"?process.env.STRIPE_PRICE_BUSINESS:"";
    if(!priceId){send(res,400,{error:"Unknown plan."});return}
    if(!token){send(res,401,{error:"Authentication required.",details:"Connecte-toi avant de démarrer un abonnement."});return}
    const userResponse=await fetch(supabaseUrl+"/auth/v1/user",{headers:{"apikey":anon,"Authorization":"Bearer "+token}});
    const user=await userResponse.json().catch(()=>({}));
    if(!userResponse.ok||!user?.id){send(res,401,{error:"Invalid session.",details:"Reconnecte-toi puis réessaie."});return}
    const origin="https://kidasniger.github.io/BrandForge-AI";
    const api=await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        mode:"subscription",
        "line_items[0][price]":priceId,
        "line_items[0][quantity]":"1",
        success_url:origin+"/account.html?checkout=success",
        cancel_url:origin+"/pricing.html?checkout=cancelled",
        customer_email:user.email||"",
        "subscription_data[metadata][user_id]":user.id,
        "subscription_data[metadata][plan]":plan,
        "metadata[user_id]":user.id,
        "metadata[plan]":plan,
        allow_promotion_codes:"true"
      })
    });
    const data=await api.json().catch(()=>({}));
    if(!api.ok){send(res,api.status,{error:"Stripe API error.",details:data?.error?.message||"Checkout creation failed."});return}
    send(res,200,{ok:true,url:data.url});
  }catch(e){send(res,500,{error:"Checkout error.",details:e?.message||"Unexpected error"})}
};