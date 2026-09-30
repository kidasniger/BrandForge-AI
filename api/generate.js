const MODEL = "gemini-3.8-flash";

function corsHeaders(origin) {
  const allowed = origin && (
    origin.endsWith(".github.io") ||
    origin.endsWith(".vercel.app") ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173"
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured on the server." }, 500, origin);

  try {
    const body = await req.json();
    const brief = body?.brief;
    if (!brief || typeof brief !== "object") {
      return json({ error: "Missing brief." }, 400, origin);
    }

    const prompt = [
      "Tu es BrandForge AI, un directeur de marque et copywriter senior.",
      "À partir du brief JSON ci-dessous, crée une identité de marque cohérente et exploitable.",
      "Réponds UNIQUEMENT avec un objet JSON valide correspondant exactement aux champs demandés.",
      "",
      "BRIEF:",
      JSON.stringify(brief, null, 2),
      "",
      "RÈGLES:",
      "- Écris en français.",
      "- Sois concret, original et adapté à l'audience et au marché.",
      "- Ne prétends pas avoir effectué des recherches externes.",
      "- Les posts doivent être directement adaptables pour les réseaux sociaux.",
      "- La landing page doit avoir un message clair et orienté conversion.",
    ].join("\n");

    const schema = {
      type: "object",
      properties: {
        tagline: { type: "string" },
        positioning: { type: "string" },
        personality: { type: "string" },
        pitch: { type: "string" },
        instagramBio: { type: "string" },
        cta: { type: "string" },
        posts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              text: { type: "string" }
            },
            required: ["title", "text"]
          }
        },
        landingHeadline: { type: "string" },
        landingDescription: { type: "string" },
        palette: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: [
        "tagline","positioning","personality","pitch","instagramBio",
        "cta","posts","landingHeadline","landingDescription","palette"
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            responseSchema: schema,
            maxOutputTokens: 2200
          }
        })
      }
    );

    const raw = await response.json();
    if (!response.ok) {
      return json({
        error: "Gemini API error",
        details: raw?.error?.message || "Unknown provider error"
      }, response.status, origin);
    }

    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: "Gemini returned no text." }, 502, origin);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return json({ error: "Gemini returned invalid JSON." }, 502, origin);
    }

    return json({ ok: true, model: MODEL, result }, 200, origin);
  } catch (error) {
    return json({ error: error?.message || "Unexpected server error." }, 500, origin);
  }
}
