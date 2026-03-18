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
    const { items, model, provider } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "No items provided" }, { status: 400 });
    }

    const userMessage = `Here are all the items I need to pack:\n\n${JSON.stringify(items, null, 2)}\n\nOrganize them into logical packing phases.`;

    let result;

    if (provider === "anthropic" || model.includes("claude")) {
      result = await callAnthropic(model, userMessage);
    } else if (provider === "gemini" || model.includes("gemini")) {
      result = await callGemini(model, userMessage);
    } else {
      return Response.json({ error: `Unknown provider for model: ${model}` }, { status: 400 });
    }

    // Parse the AI response
    const parsed = parsePhases(result.text, items);

    // Calculate cost
    const cost = calculateCost(model, result.usage);

    return Response.json({
      ...parsed,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
        cost,
      },
    });
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

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return {
    text: response.content[0].text,
    usage: {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  };
}

// ── Gemini ───────────────────────────────────────────────
async function callGemini(model, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in .env.local");

  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await genModel.generateContent(userMessage);
  const usageMetadata = result.response.usageMetadata || {};

  return {
    text: result.response.text(),
    usage: {
      inputTokens: usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
    },
  };
}

// ── Pricing (per million tokens) ─────────────────────────
const PRICING = [
  // Anthropic
  { match: "opus",   input: 15.00, output: 75.00 },
  { match: "sonnet", input: 3.00,  output: 15.00 },
  { match: "haiku",  input: 1.00,  output: 5.00  },
  // Gemini
  { match: "gemini-3.1-pro", input: 2.00,  output: 12.00 },
  { match: "gemini-3-pro",   input: 2.00,  output: 12.00 },
  { match: "gemini-3-flash", input: 0.50,  output: 3.00  },
  { match: "gemini-2.5-pro", input: 1.25,  output: 10.00 },
  { match: "gemini-2.5-flash-lite", input: 0.075, output: 0.30 },
  { match: "gemini-2.5-flash", input: 0.30,  output: 2.50 },
  { match: "gemini-2.0-flash-lite", input: 0.075, output: 0.30 },
  { match: "gemini-2.0-flash", input: 0.075, output: 0.30 },
  { match: "gemini-1.5-pro", input: 1.25,  output: 5.00  },
  { match: "gemini-1.5-flash", input: 0.075, output: 0.30 },
];

function calculateCost(model, usage) {
  const modelLower = model.toLowerCase();
  const pricing = PRICING.find((p) => modelLower.includes(p.match));

  if (!pricing) {
    return { inputCost: 0, outputCost: 0, totalCost: 0, estimated: false };
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000, // 6 decimal places
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
    estimated: true,
    inputRate: pricing.input,
    outputRate: pricing.output,
  };
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
