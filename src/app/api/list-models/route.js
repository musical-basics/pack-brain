import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const models = [];
  const errors = [];

  // ── Fetch Anthropic models ─────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== "your_anthropic_key_here") {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.ok) {
        const data = await res.json();
        const anthropicModels = (data.data || [])
          .filter((m) => m.id && !m.id.includes("embedding"))
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
          .map((m) => ({
            id: m.id,
            label: formatModelName(m.id, "anthropic"),
            provider: "anthropic",
            created: m.created_at || null,
          }));
        models.push(...anthropicModels);
      } else {
        errors.push(`Anthropic: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      errors.push(`Anthropic: ${err.message}`);
    }
  }

  // ── Fetch Gemini models ────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const geminiModels = (data.models || [])
          .filter(
            (m) =>
              m.name &&
              m.supportedGenerationMethods?.includes("generateContent") &&
              !m.name.includes("embedding") &&
              !m.name.includes("aqa") &&
              !m.name.includes("imagen") &&
              !m.name.includes("veo") &&
              !m.name.includes("lyria")
          )
          .map((m) => ({
            id: m.name.replace("models/", ""),
            label: m.displayName || formatModelName(m.name.replace("models/", ""), "gemini"),
            provider: "gemini",
            created: null,
          }));
        models.push(...geminiModels);
      } else {
        errors.push(`Gemini: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      errors.push(`Gemini: ${err.message}`);
    }
  }

  return Response.json({ models, errors });
}

// ── Format model ID into a human-readable name ──────────
function formatModelName(id, provider) {
  if (provider === "anthropic") {
    // e.g. "claude-sonnet-4-20250514" -> "Claude Sonnet 4"
    return id
      .replace(/-\d{8}$/, "") // strip date suffix
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  // Gemini: use the raw ID prettified
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
