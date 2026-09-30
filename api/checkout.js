function send(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.end(JSON.stringify(data));
}

function parseName(fullName){
  const parts=String(fullName||"BrandForge").trim().split(/\s+/).filter(Boolean);
  return {
    first_name:(parts.shift()||"BrandForge").slice(0,50),
    last_name:(parts.join(" ")||"AI").slice(0,50)
  };
}

module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){
    res.statusCode=204;
    res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    res.end();
    return;
  }
  if(req.method!=="POST"){send(res,405,{error:"Method not allowed"});return}

  const apiKey=process.env.CHARIOW_API_KEY||"";
  const productPro=process.env.CHARIOW_PRODUCT_PRO||"";
  const productBusiness=process.env.CHARIOW_PRODUCT_BUSINESS||"";
  const supabaseUrl=process.env.SUPABASE_URL||"";
  const anon=process.env.SUPABASE_ANON_KEY||"";

  if(!apiKey||!productPro||!productBusiness||!supabaseUrl||!anon){
    send(res,500,{
      error:"Chariow n'est pas encore configuré.",
      details:"Ajoute CHARIOW_API_KEY, CHARIOW_PRODUCT_PRO, CHARIOW_PRODUCT_BUSINESS, SUPABASE_URL et SUPABASE_ANON_KEY dans Vercel."
    });
    return;
  }

  try{
    const body=typeof req.body==="object"?req.body:JSON.parse(req.body||"{}");
    const plan=String(body.plan||"").toLowerCase();
    const token=String(body.accessToken||"");
    const phone=String(body.phone||"").replace(/\D/g,"");
    const countryCode=String(body.countryCode||"NE").trim().toUpperCase();
    const productId=plan==="pro"?productPro:plan==="business"?productBusiness:"";

    if(!productId){send(res,400,{error:"Plan inconnu."});return}
    if(!token){send(res,401,{error:"Connexion requise."});return}
    if(!phone){send(res,400,{error:"Numéro de téléphone requis pour le paiement Chariow."});return}
    if(!/^[A-Z]{2}$/.test(countryCode)){send(res,400,{error:"Code pays invalide."});return}

    const ur=await fetch(supabaseUrl+"/auth/v1/user",{
      headers:{apikey:anon,Authorization:"Bearer "+token}
    });
    const user=await ur.json().catch(()=>({}));
    if(!ur.ok||!user?.id){send(res,401,{error:"Session invalide."});return}

    const name=parseName(user.user_metadata?.full_name||"BrandForge AI");
    const origin="https://kidasniger.github.io/BrandForge-AI";
    const forwarded=String(req.headers?.["x-forwarded-for"]||"").split(",")[0].trim();
    const checkoutPayload={
      product_id:productId,
      email:user.email||"",
      first_name:name.first_name,
      last_name:name.last_name,
      phone:{number:phone,country_code:countryCode},
      redirect_url:origin+"/account.html?checkout=success",
      custom_metadata:{user_id:user.id,plan}
    };
    if(forwarded)checkoutPayload.customer_ip=forwarded;

    const response=await fetch("https://api.chariow.com/v1/checkout",{
      method:"POST",
      headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify(checkoutPayload)
    });
    const data=await response.json().catch(()=>({}));

    if(!response.ok){
      send(res,response.status,{
        error:"Chariow API error.",
        details:data?.message||data?.errors||"Création du checkout impossible."
      });
      return;
    }

    const result=data?.data||{};
    if(result.step==="payment"&&result.payment?.checkout_url){
      send(res,200,{
        ok:true,step:"payment",url:result.payment.checkout_url,
        saleId:result.purchase?.id||null,transactionId:result.payment?.transaction_id||null
      });
      return;
    }
    if(result.step==="completed"){
      send(res,200,{ok:true,step:"completed",url:null,saleId:result.purchase?.id||null});
      return;
    }
    if(result.step==="already_purchased"){
      send(res,409,{
        error:"Ce produit est déjà acheté pour cette adresse email.",
        step:"already_purchased",
        details:result.message||"Vérifie ton portail client Chariow."
      });
      return;
    }
    send(res,502,{error:"Réponse Chariow inattendue.",details:data});
  }catch(e){
    send(res,500,{error:"Erreur checkout Chariow.",details:e?.message||"Erreur inattendue"});
  }
};