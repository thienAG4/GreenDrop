// No WISHLIST table exists in the fixed schema, so this is a client-only,
// per-browser feature backed by localStorage (not synced across devices/accounts).
// Entries can be either a catalog product or a Builder combo, discriminated by
// `item_type` ('product' | 'combo'). Older entries saved before combos were
// supported have no `item_type` and are treated as products.
angular.module('app').factory('wishlistService', function ($rootScope) {
  var KEY = 'gd_wishlist';

  function getAll() {
    var raw = localStorage.getItem(KEY);
    var items = raw ? JSON.parse(raw) : [];
    // Normalise legacy product-only entries (no item_type stored).
    items.forEach(function (i) { if (!i.item_type) i.item_type = 'product'; });
    return items;
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    $rootScope.$broadcast('gd:wishlist-changed', items);
  }

  function entityId(item, type) {
    return type === 'combo' ? item.combo_id : item.product_id;
  }

  function sameEntry(a, id, type) {
    return a.item_type === type && entityId(a, type) === id;
  }

  function isWishlisted(id, type) {
    type = type || 'product';
    return getAll().some(function (i) { return sameEntry(i, id, type); });
  }

  // Builds the stored wishlist entry from either a product row or a combo row.
  // Combos carry no category/rating/stock and their thumbnail may come from
  // either `thumbnail_url` (catalog list) or `images[0]` (detail) - normalise
  // both here so the wishlist page can render products and combos uniformly.
  function toEntry(entity, type) {
    if (type === 'combo') {
      return {
        item_type: 'combo',
        combo_id: entity.combo_id,
        name: entity.name,
        price: Number(entity.total_price),
        image: entity.thumbnail_url || (entity.images && entity.images[0] && entity.images[0].url) || null,
        stock_quantity: null, // combos aren't stock-tracked as a single unit
        added_at: new Date().toISOString(),
      };
    }
    return {
      item_type: 'product',
      product_id: entity.product_id,
      name: entity.name,
      price: entity.price,
      stock_quantity: entity.stock_quantity,
      image: entity.images && entity.images[0] ? entity.images[0].url : (entity.image || null),
      added_at: new Date().toISOString(),
    };
  }

  function toggle(entity, type) {
    type = type || 'product';
    var id = entityId(entity, type);
    var items = getAll();
    var idx = items.findIndex(function (i) { return sameEntry(i, id, type); });
    if (idx > -1) {
      items.splice(idx, 1);
    } else {
      items.push(toEntry(entity, type));
    }
    save(items);
    return items;
  }

  // Accepts a stored wishlist entry (has item_type + the matching id column).
  function removeEntry(entry) {
    var type = entry.item_type || 'product';
    var id = entityId(entry, type);
    save(getAll().filter(function (i) { return !sameEntry(i, id, type); }));
  }

  function clear() {
    save([]);
  }

  return { getAll: getAll, isWishlisted: isWishlisted, toggle: toggle, removeEntry: removeEntry, clear: clear };
});
