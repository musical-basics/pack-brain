import { getOrCreateDefaultList, savePhases, clearPhases } from "@/lib/dbQueries";

export const dynamic = "force-dynamic";

// POST /api/packing/phases — save phases after AI generation or reorder
export async function POST(request) {
  try {
    const { phases } = await request.json();
    const list = await getOrCreateDefaultList();
    await savePhases(list.id, phases);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/packing/phases error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/packing/phases — clear all phases
export async function DELETE() {
  try {
    const list = await getOrCreateDefaultList();
    await clearPhases(list.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/packing/phases error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
