const stripeLibVersion="2026-08-27";
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.end(JSON.stringify(data))}
module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.statusCode=204;res.end();return}
  if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}
  const secret=process.env.STRIPE_SECRET_KEY||"";
  if(!secret){send(res,500,{error:"Stripe is not configured.",details:"Add STRIPE_SECRET_KEY and the plan price IDs in Vercel."});return}
  try{
    const body=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}");
    const priceMap={pro:process.env.STRIPE_PRICE_PRO,business:process.env.STRIPE_PRICE_BUSINESS};
    const priceId=priceMap[body.plan];
    if(!priceId){send(res,400,{error:"Unknown plan."});return}
    const host=String(req.headers.origin||"https://kidasniger.github.io");
    const api=await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        mode:"subscription",
        "line_items[0][price]":priceId,
        "line_items[0][quantity]":"1",
        success_url:host+"/account.html?checkout=success",
        cancel_url:host+"/pricing.html?checkout=cancelled",
        allow_promotion_codes:"true"
      })
    });
    const data=await api.json().catch(()=>({}));
    if(!api.ok){send(res,api.status,{error:"Stripe API error.",details:data?.error?.message||"Checkout creation failed."});return}
    send(res,200,{ok:true,url:data.url});
  }catch(e){send(res,500,{error:"Checkout error.",details:e?.message||"Unexpected error"})}
};