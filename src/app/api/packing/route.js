import { getListOrDefault, getCategories, getPhases, seedFromStatic } from "@/lib/dbQueries";
import { DEFAULT_CATEGORIES, DEFAULT_BAGS } from "@/lib/packingData";

export const dynamic = "force-dynamic";

// GET /api/packing?listId=<uuid> — load everything for the chosen list (or default)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const listId = url.searchParams.get("listId");
    const list = await getListOrDefault(listId);
    let categories = await getCategories(list.id);

    // If no categories exist yet, seed from the static defaults
    if (categories.length === 0) {
      await seedFromStatic(list.id, DEFAULT_CATEGORIES);
      categories = await getCategories(list.id);
    }

    const phases = await getPhases(list.id);

    // bags column may not exist yet (requires a small migration); fall back to defaults.
    const bags = Array.isArray(list.bags) && list.bags.length > 0 ? list.bags : DEFAULT_BAGS;

    return Response.json({
      list: { ...list, bags },
      categories: categories.map((c) => ({
        id: c.id,
        title: c.title,
        icon: c.icon,
        items: (c.items || []).map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          bag: i.bag,
          note: i.note,
          checked: i.checked,
        })),
      })),
      phases: phases.map((p) => ({
        title: p.title,
        description: p.description,
        itemIds: p.item_ids || [],
      })),
    });
  } catch (err) {
    console.error("GET /api/packing error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
