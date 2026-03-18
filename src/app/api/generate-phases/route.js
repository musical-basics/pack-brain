import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a packing assistant. The user has a list of items they need to pack for a trip. 
Your job is to organize these items into 4-6 logical PHASES — sequential steps they should follow to pack efficiently without getting overwhelmed.

Rules:
1. Each phase should group related items that are packed together naturally (e.g., all clothes in one batch, all tech in another)
2. Order the phases logically — what should be packed FIRST to LAST
3. Consider practical concerns:
   - Heavy/bulky items first (they go at the bottom of bags)
   - Fragile tech items should be packed with cushioning
   - Toiletries with liquids go in a separate quart-size bag for TSA
   - "Home prep" tasks (not packing — things to do before leaving) should be the LAST phase
   - "Always on you" items (wallet, phone, keys) should be the very LAST phase as a final checklist
4. Give each phase a clear, action-oriented title and a brief 1-sentence instruction
5. Every item ID from the input MUST appear in exactly ONE phase

IMPORTANT: Respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "phases": [
    {
      "title": "Phase title with emoji",
      "description": "Brief instruction for this phase",
      "itemIds": ["item-id-1", "item-id-2"]
    }
  ]
}`;

export async function POST(request) {
  try {
    const { items, model } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "No items provided" }, { status: 400 });
    }

    const userMessage = `Here are all the items I need to pack:\n\n${JSON.stringify(items, null, 2)}\n\nOrganize them into logical packing phases.`;

    let result;

    if (model.startsWith("claude")) {
      result = await callAnthropic(model, userMessage);
    } else if (model.startsWith("gemini")) {
      result = await callGemini(model, userMessage);
    } else {
      return Response.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    // Parse the AI response
    const parsed = parsePhases(result, items);

    return Response.json(parsed);
  } catch (err) {
    console.error("Phase generation error:", err);
    return Response.json(
      { error: err.message || "Failed to generate phases" },
      { status: 500 }
    );
  }
}

// ── Anthropic ────────────────────────────────────────────
async function callAnthropic(model, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local");

  const modelMap = {
    "claude-sonnet": "claude-sonnet-4-20250514",
    "claude-haiku": "claude-haiku-4-20250514",
  };

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: modelMap[model] || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content[0].text;
}

// ── Gemini ───────────────────────────────────────────────
async function callGemini(model, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in .env.local");

  const modelMap = {
    "gemini-flash": "gemini-2.0-flash",
    "gemini-pro": "gemini-1.5-pro",
  };

  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model: modelMap[model] || "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await genModel.generateContent(userMessage);
  return result.response.text();
}

// ── Parse AI response ────────────────────────────────────
function parsePhases(text, originalItems) {
  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  // Also try to find raw JSON object
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  const parsed = JSON.parse(jsonStr);

  if (!parsed.phases || !Array.isArray(parsed.phases)) {
    throw new Error("Invalid response format — no phases array");
  }

  // Validate all item IDs exist
  const validIds = new Set(originalItems.map((i) => i.id));
  const usedIds = new Set();

  parsed.phases.forEach((phase) => {
    phase.itemIds = (phase.itemIds || []).filter((id) => {
      if (validIds.has(id) && !usedIds.has(id)) {
        usedIds.add(id);
        return true;
      }
      return false;
    });
  });

  // Add any missing items to the last phase
  const missing = originalItems.filter((i) => !usedIds.has(i.id)).map((i) => i.id);
  if (missing.length > 0) {
    parsed.phases[parsed.phases.length - 1].itemIds.push(...missing);
  }

  // Remove empty phases
  parsed.phases = parsed.phases.filter((p) => p.itemIds.length > 0);

  return parsed;
}
