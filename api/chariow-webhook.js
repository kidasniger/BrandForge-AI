const crypto=require("crypto");

function send(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function readRawBody(req){
  if(Buffer.isBuffer(req.body)) return req.body;
  if(typeof req.body==="string") return Buffer.from(req.body);
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifySignature(raw,received,secret){
  if(!secret||!received||!received.startsWith("sha256=")) return false;
  const expected="sha256="+crypto.createHmac("sha256",secret).update(raw).digest("hex");
  const a=Buffer.from(received);
  const b=Buffer.from(expected);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

async function supabaseRequest(url,options){
  const r=await fetch(url,options);
  const text=await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{}
  return {response:r,data};
}

module.exports.config={api:{bodyParser:false}};

module.exports=async function handler(req,res){
  if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}

  const pulseSecret=process.env.CHARIOW_PULSE_SECRET||"";
  const supabaseUrl=process.env.SUPABASE_URL||"";
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!pulseSecret||!supabaseUrl||!service){
    send(res,500,{error:"Webhook Chariow non configuré."});
    return;
  }

  try{
    const raw=await readRawBody(req);
    const received=String(req.headers?.["x-chariow-signature"]||"");
    if(!verifySignature(raw,received,pulseSecret)){
      send(res,401,{error:"Invalid signature"});
      return;
    }

    const deliveryId=String(req.headers?.["x-pulse-delivery-id"]||"").trim();
    if(deliveryId){
      const check=await supabaseRequest(
        supabaseUrl+"/rest/v1/chariow_pulses?delivery_id=eq."+encodeURIComponent(deliveryId)+"&select=delivery_id",
        {headers:{apikey:service,Authorization:"Bearer "+service}}
      );
      if(check.response.ok&&Array.isArray(check.data)&&check.data.length){
        send(res,200,{received:true,duplicate:true});
        return;
      }
      const insert=await supabaseRequest(
        supabaseUrl+"/rest/v1/chariow_pulses",
        {
          method:"POST",
          headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},
          body:JSON.stringify({delivery_id:deliveryId,event_name:String(req.headers?.["x-pulse-event"]||"")})
        }
      );
      if(!insert.response.ok&&insert.response.status!==409){
        send(res,500,{error:"Impossible d'enregistrer le Pulse."});
        return;
      }
    }

    const payload=JSON.parse(raw.toString("utf8"));
    const event=String(payload?.event||req.headers?.["x-pulse-event"]||"");
    const sale=payload?.sale||{};
    const metadata=sale?.custom_metadata||{};
    const userId=String(metadata.user_id||"").trim();
    const productId=String(payload?.product?.id||"").trim();
    const plan=String(metadata.plan||(
      productId===process.env.CHARIOW_PRODUCT_BUSINESS?"business":
      productId===process.env.CHARIOW_PRODUCT_PRO?"pro":""
    )).toLowerCase();

    if(!userId||!plan){
      send(res,200,{received:true,updated:false});
      return;
    }

    const profileUrl=supabaseUrl+"/rest/v1/profiles?id=eq."+encodeURIComponent(userId);
    const baseHeaders={
      apikey:service,
      Authorization:"Bearer "+service,
      "Content-Type":"application/json",
      Prefer:"return=minimal"
    };

    if(event==="successful.sale"){
      const response=await fetch(profileUrl,{
        method:"PATCH",
        headers:baseHeaders,
        body:JSON.stringify({
          plan:plan==="business"?"business":"pro",
          billing_status:"active",
          chariow_customer_id:payload?.customer?.id||null,
          chariow_last_sale_id:sale?.id||null,
          updated_at:new Date().toISOString()
        })
      });
      if(!response.ok){send(res,500,{error:"Mise à jour Supabase échouée."});return}
    }else if(event==="failed.sale"){
      const response=await fetch(profileUrl,{
        method:"PATCH",
        headers:baseHeaders,
        body:JSON.stringify({
          billing_status:"past_due",
          chariow_last_sale_id:sale?.id||null,
          updated_at:new Date().toISOString()
        })
      });
      if(!response.ok){send(res,500,{error:"Mise à jour Supabase échouée."});return}
    }

    send(res,200,{received:true,updated:true,event});
  }catch(e){
    send(res,500,{error:"Webhook Chariow.",details:e?.message||"Erreur inattendue"});
  }
};