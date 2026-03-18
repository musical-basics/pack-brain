import supabase from "@/lib/db";

// ── Get or create the default packing list ────────────────
export async function getOrCreateDefaultList() {
  let { data, error } = await supabase
    .from("packing_lists")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    const res = await supabase
      .from("packing_lists")
      .insert({ title: "Parents' Home Trip", destination: "Parents' Home", duration_days: 6 })
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    data = res.data;
  }
  return data;
}

// ── Categories (with items) ───────────────────────────────
export async function getCategories(listId) {
  const { data: cats, error } = await supabase
    .from("categories")
    .select("*")
    .eq("list_id", listId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  if (!cats || cats.length === 0) return [];

  // Get all items for these categories
  const catIds = cats.map((c) => c.id);
  const { data: items, error: itemsErr } = await supabase
    .from("items")
    .select("*")
    .in("category_id", catIds)
    .order("sort_order");

  if (itemsErr) throw new Error(itemsErr.message);

  // Group items by category
  const grouped = {};
  (items || []).forEach((item) => {
    if (!grouped[item.category_id]) grouped[item.category_id] = [];
    grouped[item.category_id].push(item);
  });

  return cats.map((cat) => ({
    ...cat,
    items: grouped[cat.id] || [],
  }));
}

// ── Items ─────────────────────────────────────────────────
export async function toggleItemChecked(itemId, checked) {
  const { data, error } = await supabase
    .from("items")
    .update({ checked, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateItem(itemId, fields) {
  const allowed = {};
  for (const [key, val] of Object.entries(fields)) {
    if (["name", "qty", "bag", "note", "checked", "sort_order"].includes(key)) {
      allowed[key] = val;
    }
  }
  if (Object.keys(allowed).length === 0) return null;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("items")
    .update(allowed)
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteItem(itemId) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function reorderItems(itemIds) {
  // Batch update sort_order for each item
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from("items")
      .update({ sort_order: i })
      .eq("id", itemIds[i]);
    if (error) throw new Error(error.message);
  }
}

// ── Phases ────────────────────────────────────────────────
export async function getPhases(listId) {
  const { data, error } = await supabase
    .from("phases")
    .select("*")
    .eq("list_id", listId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePhases(listId, phases) {
  // Delete existing phases for this list
  const { error: delErr } = await supabase
    .from("phases")
    .delete()
    .eq("list_id", listId);
  if (delErr) throw new Error(delErr.message);

  if (!phases || phases.length === 0) return;

  // Insert new phases
  const rows = phases.map((p, i) => ({
    list_id: listId,
    title: p.title,
    description: p.description || "",
    item_ids: p.itemIds || p.item_ids || [],
    sort_order: i,
  }));

  const { error: insErr } = await supabase.from("phases").insert(rows);
  if (insErr) throw new Error(insErr.message);
}

export async function clearPhases(listId) {
  const { error } = await supabase.from("phases").delete().eq("list_id", listId);
  if (error) throw new Error(error.message);
}

// ── Seed data from the static app ─────────────────────────
export async function seedFromStatic(listId, categories) {
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];

    const { data: catData, error: catErr } = await supabase
      .from("categories")
      .insert({
        list_id: listId,
        title: cat.title,
        icon: cat.icon || "📦",
        sort_order: ci,
      })
      .select("id")
      .single();

    if (catErr) throw new Error(catErr.message);
    const categoryId = catData.id;

    if (cat.items && cat.items.length > 0) {
      const itemRows = cat.items.map((item, ii) => ({
        id: item.id,
        category_id: categoryId,
        name: item.name,
        qty: item.qty || 1,
        bag: item.bag || "checked-bag",
        note: item.note || "",
        checked: false,
        sort_order: ii,
      }));

      const { error: itemErr } = await supabase.from("items").insert(itemRows);
      if (itemErr) throw new Error(itemErr.message);
    }
  }
}
