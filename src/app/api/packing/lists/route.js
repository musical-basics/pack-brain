import {
  getAllLists,
  createList,
  updateList,
  deleteList,
  duplicateList,
  seedFromStatic,
} from "@/lib/dbQueries";
import { DEFAULT_CATEGORIES } from "@/lib/packingData";

export const dynamic = "force-dynamic";

// GET /api/packing/lists — return every list (id, title, destination, days, created_at)
export async function GET() {
  try {
    const lists = await getAllLists();
    return Response.json({ lists });
  } catch (err) {
    console.error("GET /api/packing/lists error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/packing/lists — create a new list, optionally duplicating from `fromListId`,
// or seeding from the static defaults when `seed: true`.
export async function POST(request) {
  try {
    const body = await request.json();
    const { fromListId, seed, title, destination, duration_days } = body;

    let list;
    if (fromListId) {
      list = await duplicateList(fromListId, { title, destination, duration_days });
    } else {
      list = await createList({ title, destination, duration_days });
      if (seed) await seedFromStatic(list.id, DEFAULT_CATEGORIES);
    }
    return Response.json({ list });
  } catch (err) {
    console.error("POST /api/packing/lists error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/packing/lists — rename / update metadata
export async function PATCH(request) {
  try {
    const { listId, fields } = await request.json();
    if (!listId) return Response.json({ error: "listId required" }, { status: 400 });
    const list = await updateList(listId, fields || {});
    return Response.json({ list });
  } catch (err) {
    console.error("PATCH /api/packing/lists error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/packing/lists?listId=<uuid> — delete a list (cascades to categories/items/phases)
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const listId = url.searchParams.get("listId");
    if (!listId) return Response.json({ error: "listId required" }, { status: 400 });
    await deleteList(listId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/packing/lists error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
