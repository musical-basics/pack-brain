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

// ── Resolve a list by id, falling back to the default list ─
export async function getListOrDefault(listId) {
  if (listId) {
    const { data, error } = await supabase
      .from("packing_lists")
      .select("*")
      .eq("id", listId)
      .single();
    if (!error && data) return data;
  }
  return getOrCreateDefaultList();
}

// ── Lists CRUD ────────────────────────────────────────────
export async function getAllLists() {
  const { data, error } = await supabase
    .from("packing_lists")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createList({ title, destination, duration_days }) {
  const { data, error } = await supabase
    .from("packing_lists")
    .insert({
      title: title || "New Trip",
      destination: destination || null,
      duration_days: duration_days ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateList(listId, fields) {
  const allowed = {};
  for (const [k, v] of Object.entries(fields)) {
    if (["title", "destination", "duration_days"].includes(k)) allowed[k] = v;
  }
  if (Object.keys(allowed).length === 0) return null;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("packing_lists")
    .update(allowed)
    .eq("id", listId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteList(listId) {
  const { error } = await supabase.from("packing_lists").delete().eq("id", listId);
  if (error) throw new Error(error.message);
}

// ── Duplicate a list (copy categories + items + phases) ───
// Items get fresh IDs (since items.id is TEXT PK) and `checked` is reset.
// Phase item_ids arrays are remapped from old → new IDs.
export async function duplicateList(fromListId, { title, destination, duration_days } = {}) {
  const source = await getListOrDefault(fromListId);

  const newList = await createList({
    title: title || `${source.title} (copy)`,
    destination: destination ?? source.destination,
    duration_days: duration_days ?? source.duration_days,
  });

  const sourceCats = await getCategories(source.id);
  const idMap = {}; // old item id → new item id

  for (let ci = 0; ci < sourceCats.length; ci++) {
    const cat = sourceCats[ci];
    const { data: catRow, error: catErr } = await supabase
      .from("categories")
      .insert({
        list_id: newList.id,
        title: cat.title,
        icon: cat.icon || "📦",
        sort_order: ci,
      })
      .select("id")
      .single();
    if (catErr) throw new Error(catErr.message);

    if (cat.items && cat.items.length > 0) {
      const itemRows = cat.items.map((item, ii) => {
        const newId = `dup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${ii}`;
        idMap[item.id] = newId;
        return {
          id: newId,
          category_id: catRow.id,
          name: item.name,
          qty: item.qty,
          bag: item.bag,
          note: item.note,
          checked: false,
          sort_order: ii,
        };
      });
      const { error: itemErr } = await supabase.from("items").insert(itemRows);
      if (itemErr) throw new Error(itemErr.message);
    }
  }

  // Copy phases with remapped item_ids
  const sourcePhases = await getPhases(source.id);
  if (sourcePhases.length > 0) {
    const phaseRows = sourcePhases.map((p, i) => ({
      list_id: newList.id,
      title: p.title,
      description: p.description || "",
      item_ids: (p.item_ids || []).map((oldId) => idMap[oldId]).filter(Boolean),
      sort_order: i,
    }));
    const { error: phErr } = await supabase.from("phases").insert(phaseRows);
    if (phErr) throw new Error(phErr.message);
  }

  return newList;
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
export async function createItem({ id, categoryId, name, qty, bag, note }) {
  const { data: maxOrder } = await supabase
    .from("items")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("items")
    .insert({
      id,
      category_id: categoryId,
      name: name || "New item",
      qty: qty || 1,
      bag: bag || "checked-bag",
      note: note || "",
      checked: false,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

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
