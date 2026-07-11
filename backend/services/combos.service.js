const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { COMBO_TYPE, BUILDER_ASSEMBLY_FEE, BUILDER_MAX_COMPONENTS } = require('../utils/constants');

// Schema note: COMBOS.created_by_user_id is NOT NULL, so saving/adding a Builder
// design always requires a logged-in account. Guests can still play with the
// Builder UI client-side, but are prompted to sign in to save or check out with it.

async function loadComponents(items) {
  if (!items || !items.length) throw new HttpError(400, 'A design needs at least one component');
  if (items.length > BUILDER_MAX_COMPONENTS) {
    throw new HttpError(400, `A design cannot exceed ${BUILDER_MAX_COMPONENTS} components`); // Exception 6
  }

  const ids = items.map((i) => i.product_id);
  const [products] = await db.query('SELECT * FROM PRODUCTS WHERE product_id IN (?)', [ids]);
  const productMap = Object.fromEntries(products.map((p) => [p.product_id, p]));

  const unavailable = [];
  for (const item of items) {
    const product = productMap[item.product_id];
    if (!product || product.status !== 'active' || product.stock_quantity < (item.quantity || 1)) {
      unavailable.push(item.product_id);
    }
  }
  if (unavailable.length) {
    // BR-01 / Exception 2: only in-stock components allowed
    const err = new HttpError(409, 'One or more selected components are out of stock');
    err.unavailable_product_ids = unavailable;
    throw err;
  }

  return { items, productMap };
}

function validateMinimumComponents(items, productMap) {
  const roles = items.map((i) => i.component_role);
  const hasPot = roles.includes('pot');
  const hasSoil = roles.includes('soil');
  if (!hasPot || !hasSoil) {
    // BR-02 / Exception 1: must have at least 1 pot and 1 substrate soil
    throw new HttpError(400, 'A design must include at least one pot and one substrate soil');
  }
}

function computeTotalPrice(items, productMap) {
  const componentsTotal = items.reduce((sum, item) => {
    const product = productMap[item.product_id];
    return sum + Number(product.price) * (item.quantity || 1);
  }, 0);
  return componentsTotal + BUILDER_ASSEMBLY_FEE;
}

async function getComboDetail(comboId) {
  const [rows] = await db.query(
    `SELECT c.*, u.full_name AS creator_name
     FROM COMBOS c JOIN USERS u ON u.user_id = c.created_by_user_id
     WHERE c.combo_id = ?`,
    [comboId]
  );
  if (!rows.length) throw new HttpError(404, 'Design not found');
  const combo = rows[0];
  const [items] = await db.query(
    `SELECT ci.*, p.name, p.price, p.stock_quantity, p.status,
            (SELECT url FROM IMAGES WHERE is_combo = FALSE AND product_id = p.product_id
             ORDER BY sort_order LIMIT 1) AS image_url
     FROM COMBO_ITEMS ci JOIN PRODUCTS p ON p.product_id = ci.product_id
     WHERE ci.combo_id = ?`,
    [comboId]
  );
  const [images] = await db.query(
    'SELECT * FROM IMAGES WHERE is_combo = TRUE AND combo_id = ? ORDER BY sort_order',
    [comboId]
  );
  return { ...combo, items, images };
}

async function listMyDesigns(userId) {
  const [rows] = await db.query(
    'SELECT * FROM COMBOS WHERE created_by_user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return Promise.all(rows.map((r) => getComboDetail(r.combo_id)));
}

// Admin view across every user's designs (client + server management UI has
// no per-user scoping, unlike listMyDesigns). Returns component count/total
// instead of forcing combos into product-table columns (SKU/category/stock)
// they don't semantically have.
async function listAllCombos() {
  const [rows] = await db.query(
    `SELECT c.*, u.full_name AS creator_name,
            (SELECT COUNT(*) FROM COMBO_ITEMS ci WHERE ci.combo_id = c.combo_id) AS item_count
     FROM COMBOS c JOIN USERS u ON u.user_id = c.created_by_user_id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

// Public "community" catalog: every saved Builder design is browsable and
// buyable by any customer (COMBOS has no visibility/privacy column, and the
// product ask is explicitly to surface designs to other shoppers). Returns a
// lightweight card row (creator, thumbnail, item count) rather than the full
// component detail, which the detail endpoint provides per-combo.
async function listPublicCombos() {
  const [rows] = await db.query(
    `SELECT c.combo_id, c.combo_type, c.name, c.total_price, c.created_at,
            u.full_name AS creator_name,
            (SELECT COUNT(*) FROM COMBO_ITEMS ci WHERE ci.combo_id = c.combo_id) AS item_count,
            (SELECT url FROM IMAGES WHERE is_combo = TRUE AND combo_id = c.combo_id
             ORDER BY sort_order LIMIT 1) AS thumbnail_url
     FROM COMBOS c JOIN USERS u ON u.user_id = c.created_by_user_id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

const PREVIEW_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'combos');
const DATA_URI_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

// Turns the value the client sends back for `preview_image_base64` into a
// stable IMAGES.url. Pixazo's SDXL API returns a hosted image URL directly
// (like the no-key placehold.co fallback), so both are stored as-is - no file
// to write, matching how external CDN URLs are already stored directly
// elsewhere in IMAGES (see init.sql's seeded product images). The data-URI
// decode path below is dead code against the current provider but kept in
// case a future swap returns inline base64 again, the way the earlier Gemini
// integration did.
async function preparePreviewImageUrl(previewImage) {
  if (!previewImage) return null;
  const match = DATA_URI_RE.exec(previewImage);
  if (!match) return previewImage;

  const [, mimeType, base64Data] = match;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.promises.mkdir(PREVIEW_UPLOADS_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(PREVIEW_UPLOADS_DIR, filename), Buffer.from(base64Data, 'base64'));

  const base = process.env.PUBLIC_UPLOADS_URL || '/uploads';
  return `${base}/combos/${filename}`;
}

// Replaces this design's single gallery image (sort_order = 1, the thumbnail
// slot cart.service.js already reads for combo line-item images) with the
// newly-saved preview. Only called when the request actually included one -
// leaving an older persisted preview in place if the customer saved again
// without regenerating.
async function saveComboPreviewImage(conn, comboId, previewUrl) {
  await conn.query('DELETE FROM IMAGES WHERE is_combo = TRUE AND combo_id = ?', [comboId]);
  await conn.query('INSERT INTO IMAGES (url, sort_order, combo_id, is_combo) VALUES (?, 1, ?, TRUE)', [
    previewUrl,
    comboId,
  ]);
}

async function createCombo(userId, { combo_type, name, items, preview_image_base64 }) {
  if (!Object.values(COMBO_TYPE).includes(combo_type)) {
    throw new HttpError(400, 'Invalid builder type');
  }
  const { productMap } = await loadComponents(items);
  validateMinimumComponents(items, productMap);
  const totalPrice = computeTotalPrice(items, productMap);
  const previewUrl = await preparePreviewImageUrl(preview_image_base64);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO COMBOS (combo_type, name, total_price, created_by_user_id) VALUES (?, ?, ?, ?)',
      [combo_type, name || 'My Terrarium Design', totalPrice, userId]
    );
    const comboId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO COMBO_ITEMS (combo_id, product_id, quantity, component_role) VALUES (?, ?, ?, ?)',
        [comboId, item.product_id, item.quantity || 1, item.component_role]
      );
    }
    if (previewUrl) await saveComboPreviewImage(conn, comboId, previewUrl);
    await conn.commit();
    return getComboDetail(comboId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateCombo(userId, comboId, { name, items, preview_image_base64 }, isAdmin = false) {
  const [rows] = await db.query('SELECT * FROM COMBOS WHERE combo_id = ?', [comboId]);
  if (!rows.length) throw new HttpError(404, 'Design not found');
  if (rows[0].created_by_user_id !== userId && !isAdmin) throw new HttpError(403, 'Not your design');

  let totalPrice = rows[0].total_price;
  if (items) {
    const { productMap } = await loadComponents(items);
    validateMinimumComponents(items, productMap);
    totalPrice = computeTotalPrice(items, productMap);
    await db.query('DELETE FROM COMBO_ITEMS WHERE combo_id = ?', [comboId]);
    for (const item of items) {
      await db.query(
        'INSERT INTO COMBO_ITEMS (combo_id, product_id, quantity, component_role) VALUES (?, ?, ?, ?)',
        [comboId, item.product_id, item.quantity || 1, item.component_role]
      );
    }
  }

  await db.query('UPDATE COMBOS SET name = COALESCE(?, name), total_price = ? WHERE combo_id = ?', [
    name || null,
    totalPrice,
    comboId,
  ]);

  const previewUrl = await preparePreviewImageUrl(preview_image_base64);
  if (previewUrl) await saveComboPreviewImage(db, comboId, previewUrl);

  return getComboDetail(comboId);
}

async function deleteCombo(userId, comboId, isAdmin = false) {
  const [rows] = await db.query('SELECT * FROM COMBOS WHERE combo_id = ?', [comboId]);
  if (!rows.length) throw new HttpError(404, 'Design not found');
  if (rows[0].created_by_user_id !== userId && !isAdmin) throw new HttpError(403, 'Not your design');
  try {
    await db.query('DELETE FROM COMBOS WHERE combo_id = ?', [comboId]);
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      throw new HttpError(409, 'Cannot delete: this design is already part of a cart or order');
    }
    throw err;
  }
}

// Pixazo's "SDXL Base 1.0" API (gateway.pixazo.ai, an Azure API Management
// front door - recognizable from the Ocp-Apim-Subscription-Key header) - free
// during preview, 60 req/min fair-use limit, per Pixazo's own docs. This
// replaced a Google Gemini integration that hit real Google-side quota
// limits. Keeping the endpoint/model choice in these constants + the
// request/response shape scoped to generateAiPreview means a future provider
// swap only touches this function.
const PIXAZO_IMAGE_API_URL = 'https://gateway.pixazo.ai/getImage/v1/getSDXLImage';
const PIXAZO_TIMEOUT_MS = 30000;
const PIXAZO_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, deformed, extra limbs, text, watermark, cartoonish, oversaturated';

// Plain-English visual descriptions per role, used instead of the raw product
// name/description strings. Those are Vietnamese marketing copy the image
// model has no visual grounding for (a made-up product name like "Bình thủy
// tinh mẫu 1" isn't a real-world object it was trained on, and a colon-
// delimited "role: name" label isn't natural language a CLIP-based text
// encoder parses as a distinct object either) - feeding them into the prompt
// produced images that ignored the actual selected components. Describing
// what each role visually *is* is what the model can actually act on.
const ROLE_PHRASES = {
  pot: () => 'a clear glass terrarium container',
  soil: () => 'a layer of dark terrarium soil substrate covering the bottom',
  plant: (count) => (count > 1 ? `${count} small potted plants` : 'a small potted plant'),
  accessory: (count) => (count > 1 ? `${count} small decorative accessories` : 'a small decorative accessory'),
};

// `position` (e.g. "left back") is optional - only the 3D Terrarium Studio
// sends it, since that's the only mode where the customer actually arranged
// components spatially rather than just picking them from a list. Folding it
// into the prompt lets the generated image reflect their actual layout.
function buildPreviewPrompt(items) {
  const counts = {};
  const positions = [];
  for (const item of items) {
    counts[item.component_role] = (counts[item.component_role] || 0) + (item.quantity || 1);
    if (item.position) {
      const phrase = (ROLE_PHRASES[item.component_role] || (() => 'a terrarium component'))(1);
      positions.push(`${phrase} positioned at the ${item.position} of the container`);
    }
  }

  const contents = Object.keys(counts).map((role) => {
    const phraseFn = ROLE_PHRASES[role] || (() => 'a terrarium component');
    return phraseFn(counts[role]);
  });

  let prompt =
    'A photorealistic product photo of a fully assembled terrarium, containing ' +
    contents.join(', ') +
    ', all arranged together inside the single glass container';
  if (positions.length) {
    prompt += ', with ' + positions.join(' and ');
  }
  prompt +=
    '. Soft natural lighting, clean neutral studio background, professional e-commerce ' +
    'product photography, sharp focus, high detail.';
  return prompt;
}

// How many candidate images the AI Builder offers the customer to choose from.
const PREVIEW_VARIANT_COUNT = 3;

// One call to Pixazo's SDXL Base 1.0 image API for a single candidate image.
// Each call uses a fresh random seed so the same prompt yields visually
// distinct variants. Throws an HttpError on any failure so the caller can
// decide how to react across the batch of candidates.
async function requestPixazoImage(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PIXAZO_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(PIXAZO_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Ocp-Apim-Subscription-Key': process.env.PIXAZO_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: PIXAZO_NEGATIVE_PROMPT,
        height: 1024,
        width: 1024,
        num_steps: 20,
        guidance_scale: 5,
        seed: Math.floor(Math.random() * 2 ** 31),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    // Exception 3: AI model unreachable/timeout - let the caller retry or switch to 3D mode.
    // Logged distinctly so a future outage/deprecation shows up as a grep-able pattern
    // instead of silently rotting behind the placeholder fallback.
    console.error('[AI preview] network error calling Pixazo API:', err.message);
    throw new HttpError(502, 'Unable to reach the AI image service, please try again');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`[AI preview] Pixazo API error status=${response.status} body=${detail.slice(0, 300)}`);
    if (response.status === 429) {
      // Azure APIM's own fair-use rate limit (60 req/min) - distinct from a bad key.
      throw new HttpError(429, 'The AI image service is rate limited right now, please try again shortly');
    }
    if (response.status >= 400 && response.status < 500) {
      // Typically 401 "Access denied due to invalid subscription key" - a bad/missing
      // key, not something the shopper can fix by retrying.
      throw new HttpError(500, 'The AI image service is misconfigured, please contact support');
    }
    // 5xx from Pixazo - transient upstream failure, safe to suggest a retry.
    throw new HttpError(502, 'The AI image service could not generate a preview, please try again');
  }

  const body = await response.json();
  if (!body.imageUrl) {
    // 200 OK but no image URL - Pixazo doesn't document a safety-filter concept for
    // this model, but treat an empty result the same way in case one exists silently.
    console.error('[AI preview] Pixazo API returned no imageUrl');
    throw new HttpError(422, 'The AI image service could not generate an image for this combination, please try a different one');
  }

  return { image_url: body.imageUrl, generated_at: new Date().toISOString() };
}

// Generates PREVIEW_VARIANT_COUNT candidate images for a design so the customer
// can pick the one they like best. Falls back to placeholder images when no key
// is configured, same simulation pattern the rest of this codebase uses for
// payment gateways / email-SMS (see utils/notify.js) so the app still runs
// end-to-end with zero external accounts. Returns { previews: [...] }.
async function generateAiPreview(items) {
  if (!items || !items.length) throw new HttpError(400, 'A design needs at least one component');

  if (!process.env.PIXAZO_API_KEY) {
    const seed = items.map((i) => i.product_id).join('-');
    const previews = Array.from({ length: PREVIEW_VARIANT_COUNT }, (_, i) => ({
      image_url: `https://placehold.co/600x400?text=AI+Terrarium+Preview+${i + 1}+${encodeURIComponent(seed)}`,
      generated_at: new Date().toISOString(),
    }));
    return { previews };
  }

  const prompt = buildPreviewPrompt(items);
  // Fire the candidates concurrently and keep whichever succeed - a single
  // flaky call shouldn't deny the customer the others. Only surface an error if
  // every candidate failed, re-raising the first failure's (already
  // shopper-friendly) HttpError so the rate-limit/misconfig/timeout distinction
  // is preserved.
  const results = await Promise.allSettled(
    Array.from({ length: PREVIEW_VARIANT_COUNT }, () => requestPixazoImage(prompt))
  );
  const previews = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!previews.length) throw results[0].reason;

  return { previews };
}

module.exports = {
  listMyDesigns,
  listAllCombos,
  listPublicCombos,
  getComboDetail,
  createCombo,
  updateCombo,
  deleteCombo,
  generateAiPreview,
  loadComponents,
};
