const MODEL = "openai/gpt-oss-120b";

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowed = origin && (
    origin === "https://kidasniger.github.io" ||
    origin.endsWith(".vercel.app") ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173"
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function send(res, req, status, data) {
  for (const [name, value] of Object.entries(corsHeaders(req))) res.setHeader(name, value);
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
function bodyOf(req){if(!req.body)return{};if(typeof req.body==="object")return req.body;try{return JSON.parse(req.body)}catch{return{}}}
function parseJson(text){
  const clean=String(text||"").trim();
  try{return JSON.parse(clean)}catch{
    const s=clean.indexOf("{"),e=clean.lastIndexOf("}");
    if(s>=0&&e>s)return JSON.parse(clean.slice(s,e+1));
    throw new Error("La réponse du modèle n'est pas un JSON valide.");
  }
}
const fullFields=[
  "tagline","mission","positioning","differentiation","personality","values","pitch","instagramBio","cta",
  "persona","painPoints","desires","proofPoints","offerIdeas","posts","contentCalendar","landingHeadline",
  "landingDescription","siteSections","palette","seoTitle","seoDescription","keywords","salesScript",
  "whatsappPitch","emailSequence","faq"
];
const modeInstructions={
  full:"Génère le kit complet. offerIdeas contient 3 objets name/description/priceIdea. posts contient 5 objets title/text/type. contentCalendar contient 7 objets day/channel/topic/hook. siteSections contient 5 objets title/body. palette contient 5 couleurs hex. faq contient 5 objets question/answer. painPoints, desires, proofPoints, keywords et values sont des tableaux de chaînes. emailSequence contient 3 objets subject/body.",
  content:"Concentre-toi sur le contenu marketing. Remplis tagline,pitch,instagramBio,cta,posts,contentCalendar,landingHeadline,landingDescription,salesScript,whatsappPitch,emailSequence et faq. Les autres champs peuvent être repris du brief.",
  growth:"Concentre-toi sur la croissance commerciale. Remplis positioning,differentiation,persona,painPoints,desires,proofPoints,offerIdeas,salesScript,whatsappPitch,emailSequence,faq,keywords et cta.",
  refine:"Améliore le projet existant selon l'instruction. Retourne le même schéma JSON et conserve ce qui reste pertinent. Fais une amélioration visible, sans changer arbitrairement le secteur."
};

module.exports=async function handler(req,res){
  if(req.method==="OPTIONS"){for(const [n,v] of Object.entries(corsHeaders(req)))res.setHeader(n,v);res.statusCode=204;res.end();return;}
  const apiKey=process.env.GROQ_API_KEY||"";
  if(req.method==="GET"){send(res,req,200,{ok:true,service:"BrandForge AI backend",provider:"Groq",model:MODEL,configured:Boolean(apiKey),keyVariable:apiKey?"GROQ_API_KEY":null});return;}
  if(req.method!=="POST"){send(res,req,405,{error:"Method not allowed"});return;}
  if(!apiKey){send(res,req,500,{error:"Groq API key is missing on Vercel.",details:"Ajoute GROQ_API_KEY dans les variables Vercel puis redéploie."});return;}
  try{
    const body=bodyOf(req),brief=body.brief,mode=body.mode||"full";
    if(!brief||typeof brief!=="object"){send(res,req,400,{error:"Missing brief.",details:"Le corps doit contenir un objet brief."});return;}
    const fields=mode==="full"?fullFields:[...new Set(fullFields)];
    const instruction=modeInstructions[mode]||modeInstructions.full;
    const prompt=[
      "Tu es BrandForge AI, directeur de marque, copywriter et conseiller en lancement.",
      "Crée une réponse directement exploitable pour un entrepreneur francophone.",
      "Réponds UNIQUEMENT avec un JSON valide, sans markdown ni commentaire.",
      "Utilise exactement ces champs de premier niveau : "+fields.join(", ")+".",
      instruction,
      "Le contenu utilisateur doit être en français. Sois concret, crédible, original et précis.",
      "Les prix sont des idées de positionnement et doivent être libellés comme tels, jamais comme des prix de marché vérifiés.",
      mode==="refine" ? "INSTRUCTION DE RÉVISION : "+String(body.instruction||"Rends le projet plus clair et plus professionnel.") : "",
      mode==="refine" ? "PROJET EXISTANT : "+JSON.stringify(body.current||{},null,2) : "",
      "BRIEF : "+JSON.stringify(brief,null,2)
    ].filter(Boolean).join("\n");
    const provider=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:MODEL,
        messages:[
          {role:"system",content:"Return only valid JSON. Follow the requested schema exactly."},
          {role:"user",content:prompt}
        ],
        temperature:0.5,
        max_completion_tokens:5500,
        response_format:{type:"json_object"}
      })
    });
    const raw=await provider.json().catch(()=>({}));
    if(!provider.ok){send(res,req,provider.status,{error:"Groq API error.",details:raw?.error?.message||"Groq a refusé la requête."});return;}
    const text=raw?.choices?.[0]?.message?.content;
    if(!text){send(res,req,502,{error:"Groq returned no text.",details:"La réponse Groq ne contient aucun contenu."});return;}
    let result;try{result=parseJson(text)}catch(e){send(res,req,502,{error:"Groq returned invalid JSON.",details:e.message});return;}
    send(res,req,200,{ok:true,provider:"Groq",model:MODEL,mode,result});
  }catch(e){send(res,req,500,{error:"Backend error.",details:e?.message||"Erreur serveur inattendue."});}
};
