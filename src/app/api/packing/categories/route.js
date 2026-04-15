import {
  createCategory,
  updateCategory,
  deleteCategory,
  getListOrDefault,
} from "@/lib/dbQueries";

export const dynamic = "force-dynamic";

// POST /api/packing/categories — create a new section in the given list
export async function POST(request) {
  try {
    const body = await request.json();
    const list = await getListOrDefault(body.listId);
    const category = await createCategory({
      listId: list.id,
      title: body.title,
      icon: body.icon,
    });
    return Response.json({ category });
  } catch (err) {
    console.error("POST /api/packing/categories error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/packing/categories — rename / change icon
export async function PATCH(request) {
  try {
    const { categoryId, fields } = await request.json();
    if (!categoryId) return Response.json({ error: "categoryId required" }, { status: 400 });
    const category = await updateCategory(categoryId, fields || {});
    return Response.json({ category });
  } catch (err) {
    console.error("PATCH /api/packing/categories error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/packing/categories?categoryId=<uuid> — delete a section (cascades to items)
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");
    if (!categoryId) return Response.json({ error: "categoryId required" }, { status: 400 });
    await deleteCategory(categoryId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/packing/categories error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
