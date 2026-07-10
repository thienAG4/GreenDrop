angular.module('app').config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'views/home.html',
      controller: 'HomeController',
      controllerAs: 'vm',
    })
    .when('/san-pham', {
      templateUrl: 'views/product-list.html',
      controller: 'ProductListController',
      controllerAs: 'vm',
    })
    .when('/san-pham/:id', {
      templateUrl: 'views/product-detail.html',
      controller: 'ProductDetailController',
      controllerAs: 'vm',
    })
    .when('/gio-hang', {
      templateUrl: 'views/cart.html',
      controller: 'CartController',
      controllerAs: 'vm',
    })
    .when('/checkout', {
      templateUrl: 'views/checkout.html',
      controller: 'CheckoutController',
      controllerAs: 'vm',
    })
    .when('/checkout/thanh-toan/:orderId', {
      templateUrl: 'views/checkout-payment.html',
      controller: 'CheckoutPaymentController',
      controllerAs: 'vm',
    })
    .when('/checkout/thanh-cong/:orderId', {
      templateUrl: 'views/checkout-success.html',
      controller: 'CheckoutSuccessController',
      controllerAs: 'vm',
    })
    .when('/dang-nhap', {
      templateUrl: 'views/auth/login.html',
      controller: 'LoginController',
      controllerAs: 'vm',
    })
    .when('/dang-ky', {
      templateUrl: 'views/auth/register.html',
      controller: 'RegisterController',
      controllerAs: 'vm',
    })
    .when('/quen-mat-khau', {
      templateUrl: 'views/auth/forgot-password.html',
      controller: 'ForgotPasswordController',
      controllerAs: 'vm',
    })
    .when('/ma-xac-thuc', {
      templateUrl: 'views/auth/verify-code.html',
      controller: 'VerifyCodeController',
      controllerAs: 'vm',
    })
    .when('/tao-mat-khau-moi', {
      templateUrl: 'views/auth/reset-password.html',
      controller: 'ResetPasswordController',
      controllerAs: 'vm',
    })
    .when('/tai-khoan/thong-tin', {
      templateUrl: 'views/account/profile.html',
      controller: 'ProfileController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/tai-khoan/dia-chi', {
      templateUrl: 'views/account/addresses.html',
      controller: 'AddressesController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/tai-khoan/mat-khau', {
      templateUrl: 'views/account/change-password.html',
      controller: 'ChangePasswordController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/tai-khoan/yeu-thich', {
      templateUrl: 'views/account/wishlist.html',
      controller: 'WishlistController',
      controllerAs: 'vm',
    })
    .when('/tai-khoan/don-hang', {
      templateUrl: 'views/account/order-history.html',
      controller: 'OrderHistoryController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/don-hang/:id', {
      templateUrl: 'views/orders/order-detail.html',
      controller: 'OrderDetailController',
      controllerAs: 'vm',
    })
    .when('/don-hang/:id/hoa-don', {
      templateUrl: 'views/orders/order-invoice.html',
      controller: 'OrderInvoiceController',
      controllerAs: 'vm',
    })
    .when('/don-hang/:id/huy', {
      templateUrl: 'views/orders/cancel-order.html',
      controller: 'CancelOrderController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/track-order', {
      templateUrl: 'views/orders/track-order.html',
      controller: 'TrackOrderController',
      controllerAs: 'vm',
    })
    .when('/don-hang/:id/tra-hang', {
      templateUrl: 'views/returns/return-flow.html',
      controller: 'ReturnFlowController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/tai-khoan/tra-hang', {
      templateUrl: 'views/returns/return-history.html',
      controller: 'ReturnHistoryController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/tai-khoan/tra-hang/:id', {
      templateUrl: 'views/returns/return-detail.html',
      controller: 'ReturnDetailController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/danh-gia', {
      templateUrl: 'views/reviews/select-review.html',
      controller: 'SelectReviewController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/danh-gia/:orderItemId', {
      templateUrl: 'views/reviews/write-review.html',
      controller: 'WriteReviewController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/combo-builder', {
      templateUrl: 'views/builder/combo-builder.html',
      controller: 'ComboBuilderController',
      controllerAs: 'vm',
    })
    .when('/thiet-ke-da-luu', {
      templateUrl: 'views/builder/saved-designs.html',
      controller: 'SavedDesignsController',
      controllerAs: 'vm',
      access: { requiresAuth: true },
    })
    .when('/combo/:id', {
      templateUrl: 'views/builder/combo-detail.html',
      controller: 'ComboDetailController',
      controllerAs: 'vm',
    })
    .when('/blog', {
      templateUrl: 'views/content/blog-list.html',
      controller: 'BlogListController',
      controllerAs: 'vm',
    })
    .when('/blog/:slug', {
      templateUrl: 'views/content/blog-detail.html',
      controller: 'BlogDetailController',
      controllerAs: 'vm',
    })
    .when('/chinh-sach', {
      templateUrl: 'views/content/policy.html',
      controller: 'PolicyController',
      controllerAs: 'vm',
    })
    .when('/ve-chung-toi', {
      templateUrl: 'views/content/about.html',
      controller: 'AboutController',
      controllerAs: 'vm',
    })
    .when('/lien-he', {
      templateUrl: 'views/content/contact.html',
      controller: 'ContactController',
      controllerAs: 'vm',
    })
    .otherwise({ templateUrl: 'views/content/not-found.html' });
});
