// No RECENTLY_VIEWED table exists in the fixed schema (same situation as
// wishlist), so this is a client-only, per-browser feature backed by
// localStorage, capped to the most recent MAX products (most-recent-first).
angular.module('app').factory('recentlyViewedService', function ($rootScope) {
  var KEY = 'gd_recently_viewed';
  var MAX = 12;

  function getAll() {
    var raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    $rootScope.$broadcast('gd:recently-viewed-changed', items);
  }

  function record(product) {
    if (!product || !product.product_id) return;
    var items = getAll().filter(function (i) { return i.product_id !== product.product_id; });
    items.unshift({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      avg_rating: product.avg_rating,
      stock_quantity: product.stock_quantity,
      category_name: product.category_name,
      images: product.images && product.images.length ? [product.images[0]] : [],
    });
    save(items.slice(0, MAX));
  }

  function list() {
    return getAll();
  }

  function clear() {
    save([]);
  }

  return { record: record, list: list, clear: clear };
});
