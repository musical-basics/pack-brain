import { createItem, toggleItemChecked, updateItem, deleteItem, reorderItems } from "@/lib/dbQueries";

export const dynamic = "force-dynamic";

// POST /api/packing/items — create a new item
export async function POST(request) {
  try {
    const body = await request.json();
    const item = await createItem({
      id: body.id,
      categoryId: body.categoryId,
      name: body.name,
      qty: body.qty,
      bag: body.bag,
      note: body.note,
    });
    return Response.json({ item });
  } catch (err) {
    console.error("POST /api/packing/items error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/packing/items — toggle checked, update fields, or reorder
export async function PATCH(request) {
  try {
    const body = await request.json();

    // Reorder
    if (body.action === "reorder" && body.itemIds) {
      await reorderItems(body.itemIds);
      return Response.json({ ok: true });
    }

    // Toggle checked
    if (body.action === "toggle" && body.itemId != null) {
      const item = await toggleItemChecked(body.itemId, body.checked);
      return Response.json({ item });
    }

    // Update fields
    if (body.action === "update" && body.itemId) {
      const item = await updateItem(body.itemId, body.fields);
      return Response.json({ item });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/packing/items error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/packing/items
export async function DELETE(request) {
  try {
    const { itemId } = await request.json();
    await deleteItem(itemId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/packing/items error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
