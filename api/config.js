module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","https://kidasniger.github.io");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method==="OPTIONS"){res.statusCode=204;res.end();return}
  if(req.method!=="GET"){res.statusCode=405;res.end(JSON.stringify({error:"Method not allowed"}));return}
  res.statusCode=200;
  res.end(JSON.stringify({ok:true,supabaseUrl:process.env.SUPABASE_URL||"https://uuystjjbgjpmzptmltmr.supabase.co",supabaseAnonKey:process.env.SUPABASE_ANON_KEY||""}));
};