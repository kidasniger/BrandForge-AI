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
    res.statusCode = 204;
    for (const [name, value] of Object.entries(corsHeaders(req))) {
      res.setHeader(name, value);
    }
    res.end();
    return;
  }

  const apiKey = process.env.GROQ_API_KEY || "";

  if (req.method === "GET") {
    send(res, req, 200, {
      ok: true,
      service: "BrandForge AI backend",
      provider: "Groq",
      model: MODEL,
      configured: Boolean(apiKey),
      keyVariable: apiKey ? "GROQ_API_KEY" : null
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, req, 405, { error: "Method not allowed" });
    return;
  }

  if (!apiKey) {
    send(res, req, 500, {
      error: "Groq API key is missing on Vercel.",
      details: "Add GROQ_API_KEY to the Vercel project Environment Variables, then redeploy."
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
      "You are BrandForge AI, a senior brand strategist and copywriter.",
      "Using the following brief, create a coherent, practical brand identity.",
      "Return ONLY valid JSON. No markdown, no commentary, and no text outside the JSON.",
      "Use exactly these top-level fields:",
      "tagline, positioning, personality, pitch, instagramBio, cta, posts, landingHeadline, landingDescription, palette.",
      "posts must contain 3 to 5 objects with title and text.",
      "palette must contain exactly 5 color values as hex strings.",
      "All user-facing brand copy must be written in French.",
      "Be concrete, original, concise, and aligned with the audience, offer, objective, tone, market, and creative direction.",
      "",
      "BRIEF:",
      JSON.stringify(brief, null, 2)
    ].join("\n");

    const providerResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: "Return only valid JSON matching the requested fields. Do not include markdown."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.4,
          max_completion_tokens: 3000,
          response_format: { type: "json_object" }
        })
      }
    );

    const raw = await providerResponse.json().catch(() => ({}));

    if (!providerResponse.ok) {
      send(res, req, providerResponse.status, {
        error: "Groq API error.",
        details: raw && raw.error && raw.error.message
          ? raw.error.message
          : "Groq rejected the request."
      });
      return;
    }

    const text = raw &&
      raw.choices &&
      raw.choices[0] &&
      raw.choices[0].message &&
      raw.choices[0].message.content;

    if (!text) {
      send(res, req, 502, {
        error: "Groq returned no text.",
        details: "The provider response contained no assistant content."
      });
      return;
    }

    let result;
    try {
      result = parseModelJson(text);
    } catch (error) {
      send(res, req, 502, {
        error: "Groq returned invalid JSON.",
        details: error && error.message ? error.message : "Could not parse the model response."
      });
      return;
    }

    send(res, req, 200, {
      ok: true,
      provider: "Groq",
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
