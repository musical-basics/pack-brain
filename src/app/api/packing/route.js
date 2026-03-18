import { getOrCreateDefaultList, getCategories, getPhases, seedFromStatic } from "@/lib/dbQueries";
import { DEFAULT_CATEGORIES } from "@/lib/packingData";

export const dynamic = "force-dynamic";

// GET /api/packing — load everything for the current list
export async function GET() {
  try {
    const list = await getOrCreateDefaultList();
    let categories = await getCategories(list.id);

    // If no categories exist yet, seed from the static defaults
    if (categories.length === 0) {
      await seedFromStatic(list.id, DEFAULT_CATEGORIES);
      categories = await getCategories(list.id);
    }

    const phases = await getPhases(list.id);

    return Response.json({
      list,
      categories: categories.map((c) => ({
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
