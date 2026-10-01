function send(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.end(JSON.stringify(data));
}
module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){send(res,204,{});return}
  if(req.method!=="GET"){send(res,405,{error:"Method not allowed"});return}
  const supabaseUrl=process.env.SUPABASE_URL||"",service=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!supabaseUrl||!service){
    send(res,200,{ok:true,source:"fallback",plans:[{slug:"pro",name:"Pro",price_xof:500,active:true,chariow_product_id:""},{slug:"business",name:"Business",price_xof:1000,active:true,chariow_product_id:""}]});return;
  }
  try{
    const r=await fetch(supabaseUrl+"/rest/v1/billing_plans?select=slug,name,price_xof,chariow_product_id,active&order=slug",{headers:{apikey:service,Authorization:"Bearer "+service}});
    const data=await r.json().catch(()=>[]);
    if(!r.ok) throw new Error(data?.message||"Lecture impossible");
    send(res,200,{ok:true,source:"supabase",plans:data||[]});
  }catch(e){send(res,200,{ok:true,source:"fallback",plans:[{slug:"pro",name:"Pro",price_xof:500,active:true},{slug:"business",name:"Business",price_xof:1000,active:true}]});}
};
