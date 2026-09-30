const MODEL = "gemini-3.8-flash";

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
  const headers = corsHeaders(req);
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function extractBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function parseModelJson(text) {
  const clean = String(text || "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("Model response was not valid JSON.");
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).set(corsHeaders(req)).end();
    return;
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

  if (req.method === "GET") {
    send(res, req, 200, {
      ok: true,
      service: "BrandForge AI backend",
      model: MODEL,
      configured: Boolean(apiKey),
      keyVariable: process.env.GEMINI_API_KEY
        ? "GEMINI_API_KEY"
        : process.env.GEMINI_KEY
          ? "GEMINI_KEY"
          : process.env.GOOGLE_API_KEY
            ? "GOOGLE_API_KEY"
            : null
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, req, 405, { error: "Method not allowed" });
    return;
  }

  if (!apiKey) {
    send(res, req, 500, {
      error: "Gemini API key is missing on Vercel.",
      details: "Add GEMINI_API_KEY or GEMINI_KEY to the Vercel project Environment Variables, then redeploy."
    });
    return;
  }

  try {
    const body = extractBody(req);
    const brief = body && body.brief;

    if (!brief || typeof brief !== "object") {
      send(res, req, 400, {
        error: "Missing brief.",
        details: "The request must contain a JSON body with a brief object."
      });
      return;
    }

    const prompt = [
      "Tu es BrandForge AI, un directeur de marque et copywriter senior.",
      "À partir du brief JSON ci-dessous, crée une identité de marque cohérente et exploitable.",
      "Réponds UNIQUEMENT avec un objet JSON valide. Aucun markdown et aucun texte avant ou après le JSON.",
      "Le JSON doit contenir : tagline, positioning, personality, pitch, instagramBio, cta, posts (3 à 5 objets title/text), landingHeadline, landingDescription et palette (5 couleurs).",
      "Écris en français. Sois concret, original et adapté à l'audience et au marché.",
      "",
      "BRIEF:",
      JSON.stringify(brief, null, 2)
    ].join("\n");

    const providerResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2200
          }
        })
      }
    );

    const raw = await providerResponse.json().catch(() => ({}));

    if (!providerResponse.ok) {
      send(res, req, providerResponse.status, {
        error: "Gemini API error.",
        details: raw && raw.error && raw.error.message
          ? raw.error.message
          : "Gemini rejected the request."
      });
      return;
    }

    const text = raw &&
      raw.candidates &&
      raw.candidates[0] &&
      raw.candidates[0].content &&
      raw.candidates[0].content.parts &&
      raw.candidates[0].content.parts[0] &&
      raw.candidates[0].content.parts[0].text;

    if (!text) {
      send(res, req, 502, {
        error: "Gemini returned no text.",
        details: "The provider response contained no text candidate."
      });
      return;
    }

    let result;
    try {
      result = parseModelJson(text);
    } catch (error) {
      send(res, req, 502, {
        error: "Gemini returned invalid JSON.",
        details: error && error.message ? error.message : "Could not parse the model response."
      });
      return;
    }

    send(res, req, 200, {
      ok: true,
      model: MODEL,
      result
    });
  } catch (error) {
    send(res, req, 500, {
      error: "Backend error.",
      details: error && error.message ? error.message : "Unexpected server error."
    });
  }
};
