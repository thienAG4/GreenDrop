angular.module('app').factory('cartService', function ($http, $rootScope, API_BASE_URL) {
  var cache = { cart_id: null, items: [], subtotal: 0 };

  function refresh() {
    return $http.get(API_BASE_URL + '/cart').then(function (res) {
      angular.copy(res.data.data, cache);
      $rootScope.$broadcast('gd:cart-changed', cache);
      return cache;
    });
  }

  function itemCount() {
    return cache.items.reduce(function (sum, i) { return sum + i.quantity; }, 0);
  }

  function addItem(body) {
    return $http.post(API_BASE_URL + '/cart/items', body).then(function (res) {
      angular.copy(res.data.data, cache);
      $rootScope.$broadcast('gd:cart-changed', cache);
      return cache;
    });
  }

  function updateItem(body) {
    return $http.put(API_BASE_URL + '/cart/items', body).then(function (res) {
      angular.copy(res.data.data, cache);
      $rootScope.$broadcast('gd:cart-changed', cache);
      return cache;
    });
  }

  function removeItem(body) {
    return $http({ method: 'DELETE', url: API_BASE_URL + '/cart/items', data: body, headers: { 'Content-Type': 'application/json' } }).then(
      function (res) {
        angular.copy(res.data.data, cache);
        $rootScope.$broadcast('gd:cart-changed', cache);
        return cache;
      }
    );
  }

  return { cache: cache, refresh: refresh, itemCount: itemCount, addItem: addItem, updateItem: updateItem, removeItem: removeItem };
});
