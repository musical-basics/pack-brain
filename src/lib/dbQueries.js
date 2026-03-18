import pool from "@/lib/db";

// ── Get or create the default packing list ────────────────
export async function getOrCreateDefaultList() {
  let result = await pool.query(
    "SELECT * FROM packing_lists ORDER BY created_at ASC LIMIT 1"
  );
  if (result.rows.length === 0) {
    result = await pool.query(
      `INSERT INTO packing_lists (title, destination, duration_days)
       VALUES ($1, $2, $3) RETURNING *`,
      ["Parents' Home Trip", "Parents' Home", 6]
    );
  }
  return result.rows[0];
}

// ── Categories ────────────────────────────────────────────
export async function getCategories(listId) {
  const result = await pool.query(
    `SELECT c.*, 
       json_agg(
         json_build_object(
           'id', i.id, 'name', i.name, 'qty', i.qty, 
           'bag', i.bag, 'note', i.note, 'checked', i.checked,
           'sort_order', i.sort_order
         ) ORDER BY i.sort_order
       ) FILTER (WHERE i.id IS NOT NULL) AS items
     FROM categories c
     LEFT JOIN items i ON i.category_id = c.id
     WHERE c.list_id = $1
     GROUP BY c.id
     ORDER BY c.sort_order`,
    [listId]
  );
  return result.rows.map((cat) => ({
    ...cat,
    items: cat.items || [],
  }));
}

export async function upsertCategory(listId, { title, icon, sort_order }) {
  const result = await pool.query(
    `INSERT INTO categories (list_id, title, icon, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [listId, title, icon || "📦", sort_order || 0]
  );
  return result.rows[0];
}

// ── Items ─────────────────────────────────────────────────
export async function upsertItem(categoryId, item) {
  const result = await pool.query(
    `INSERT INTO items (id, category_id, name, qty, bag, note, checked, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       qty = EXCLUDED.qty,
       bag = EXCLUDED.bag,
       note = EXCLUDED.note,
       checked = EXCLUDED.checked,
       sort_order = EXCLUDED.sort_order,
       updated_at = now()
     RETURNING *`,
    [
      item.id,
      categoryId,
      item.name,
      item.qty || 1,
      item.bag || "checked-bag",
      item.note || "",
      item.checked || false,
      item.sort_order || 0,
    ]
  );
  return result.rows[0];
}

export async function toggleItemChecked(itemId, checked) {
  const result = await pool.query(
    `UPDATE items SET checked = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [checked, itemId]
  );
  return result.rows[0];
}

export async function updateItem(itemId, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(fields)) {
    if (["name", "qty", "bag", "note", "checked", "sort_order"].includes(key)) {
      sets.push(`${key} = $${i}`);
      vals.push(val);
      i++;
    }
  }
  if (sets.length === 0) return null;
  sets.push(`updated_at = now()`);
  vals.push(itemId);
  const result = await pool.query(
    `UPDATE items SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    vals
  );
  return result.rows[0];
}

export async function deleteItem(itemId) {
  await pool.query("DELETE FROM items WHERE id = $1", [itemId]);
}

export async function reorderItems(itemIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < itemIds.length; i++) {
      await client.query("UPDATE items SET sort_order = $1 WHERE id = $2", [i, itemIds[i]]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── Phases ────────────────────────────────────────────────
export async function getPhases(listId) {
  const result = await pool.query(
    "SELECT * FROM phases WHERE list_id = $1 ORDER BY sort_order",
    [listId]
  );
  return result.rows;
}

export async function savePhases(listId, phases) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM phases WHERE list_id = $1", [listId]);
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      await client.query(
        `INSERT INTO phases (list_id, title, description, item_ids, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [listId, p.title, p.description || "", p.itemIds || p.item_ids || [], i]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function clearPhases(listId) {
  await pool.query("DELETE FROM phases WHERE list_id = $1", [listId]);
}

// ── Seed data from the static app ─────────────────────────
export async function seedFromStatic(listId, categories) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci];
      const catRes = await client.query(
        `INSERT INTO categories (list_id, title, icon, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [listId, cat.title, cat.icon || "📦", ci]
      );
      const categoryId = catRes.rows[0].id;
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii];
        await client.query(
          `INSERT INTO items (id, category_id, name, qty, bag, note, checked, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, categoryId, item.name, item.qty || 1, item.bag || "checked-bag", item.note || "", false, ii]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
