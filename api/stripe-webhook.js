const crypto=require("crypto");
function rawBody(req){
  if(Buffer.isBuffer(req.body)) return req.body;
  if(typeof req.body==="string") return Buffer.from(req.body);
  if(req.rawBody) return Buffer.isBuffer(req.rawBody)?req.rawBody:Buffer.from(String(req.rawBody));
  return Buffer.from(JSON.stringify(req.body||{}));
}
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data))}
function verifyStripeSignature(payload,signature,secret){
  if(!signature||!secret)return false;
  const parts=signature.split(",").reduce((a,p)=>{const [k,v]=p.split("=");(a[k]??=[]).push(v);return a},{});
  const timestamp=parts.t?.[0],sig=parts.v1?.[0];
  if(!timestamp||!sig)return false;
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(timestamp));if(age>300)return false;
  const signed=timestamp+"."+payload.toString("utf8");
  const expected=crypto.createHmac("sha256",secret).update(signed).digest("hex");
  try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig))}catch{return false}
}
module.exports=async function handler(req,res){
  if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}
  const secret=process.env.STRIPE_WEBHOOK_SECRET||"",supabaseUrl=process.env.SUPABASE_URL||"",service=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!secret||!supabaseUrl||!service){send(res,500,{error:"Webhook is not configured."});return}
  try{
    const payload=rawBody(req),signature=req.headers["stripe-signature"];
    if(!verifyStripeSignature(payload,signature,secret)){send(res,400,{error:"Invalid Stripe signature"});return}
    const event=JSON.parse(payload.toString("utf8")),obj=event.data?.object||{},metadata=obj.metadata||obj.subscription_details?.metadata||{};
    const userId=metadata.user_id;
    if(!userId){send(res,200,{received:true,updated:false});return}
    let plan="free",status="inactive";
    if(event.type==="checkout.session.completed"||event.type==="customer.subscription.created"||event.type==="customer.subscription.updated"){
      plan=metadata.plan||"pro";status=obj.status||"active";
    } else if(event.type==="customer.subscription.deleted"){
      plan="free";status="canceled";
    } else {send(res,200,{received:true,updated:false});return}
    const response=await fetch(supabaseUrl+"/rest/v1/profiles?id=eq."+encodeURIComponent(userId),{
      method:"PATCH",headers:{"apikey":service,"Authorization":"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({plan,billing_status:status,stripe_customer_id:obj.customer||null,stripe_subscription_id:obj.id||null,updated_at:new Date().toISOString()})
    });
    if(!response.ok){const t=await response.text();send(res,500,{error:"Supabase update failed.",details:t});return}
    send(res,200,{received:true,updated:true});
  }catch(e){send(res,500,{error:"Webhook error.",details:e?.message||"Unexpected error"})}
};
module.exports.config={api:{bodyParser:false}};