angular.module('adminApp').config(function ($routeProvider) {
  $routeProvider
    .when('/dang-nhap', {
      templateUrl: 'views/login.html',
      controller: 'AdminLoginController',
      controllerAs: 'vm',
    })
    .when('/', {
      templateUrl: 'views/dashboard.html',
      controller: 'DashboardController',
      controllerAs: 'vm',
    })
    .when('/san-pham', {
      templateUrl: 'views/products.html',
      controller: 'ProductsController',
      controllerAs: 'vm',
    })
    .when('/combo-builder', {
      templateUrl: 'views/combos.html',
      controller: 'CombosController',
      controllerAs: 'vm',
    })
    .when('/danh-muc', {
      templateUrl: 'views/categories.html',
      controller: 'CategoriesController',
      controllerAs: 'vm',
    })
    .when('/don-hang', {
      templateUrl: 'views/orders/orders-list.html',
      controller: 'OrdersListController',
      controllerAs: 'vm',
    })
    .when('/don-hang/:id', {
      templateUrl: 'views/orders/order-detail.html',
      controller: 'OrderDetailController',
      controllerAs: 'vm',
    })
    .when('/tra-hang', {
      templateUrl: 'views/returns.html',
      controller: 'ReturnsController',
      controllerAs: 'vm',
    })
    .when('/khach-hang', {
      templateUrl: 'views/customers/customer-list.html',
      controller: 'CustomerListController',
      controllerAs: 'vm',
    })
    .when('/khach-hang/:id', {
      templateUrl: 'views/customers/customer-detail.html',
      controller: 'CustomerDetailController',
      controllerAs: 'vm',
    })
    .when('/danh-gia', {
      templateUrl: 'views/reviews.html',
      controller: 'ReviewsController',
      controllerAs: 'vm',
    })
    .when('/khuyen-mai', {
      templateUrl: 'views/vouchers.html',
      controller: 'VouchersController',
      controllerAs: 'vm',
    })
    .when('/su-kien', {
      templateUrl: 'views/promotions.html',
      controller: 'PromotionsController',
      controllerAs: 'vm',
    })
    .when('/banner', {
      templateUrl: 'views/banners.html',
      controller: 'BannersController',
      controllerAs: 'vm',
    })
    .when('/blog', {
      templateUrl: 'views/blog.html',
      controller: 'BlogController',
      controllerAs: 'vm',
    })
    .otherwise({ redirectTo: '/' });
});
