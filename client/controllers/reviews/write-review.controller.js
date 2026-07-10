angular.module('app').controller('WriteReviewController', function ($routeParams, ordersService, reviewsService) {
  var vm = this;
  vm.loading = true;
  vm.item = null;
  vm.phase = 'write'; // write -> submitted
  vm.rating = 0;
  vm.content = '';
  vm.showName = true; // cosmetic only: schema has no per-review anonymity flag, reviewer name is always the account's real name server-side
  vm.file = null;
  vm.preview = null;
  vm.errorMessage = null;
  vm.submitting = false;

  var SATISFACTION_LABELS = { 1: 'Rất không hài lòng', 2: 'Không hài lòng', 3: 'Bình thường', 4: 'Hài lòng', 5: 'Rất hài lòng' };
  vm.satisfactionLabel = function () { return SATISFACTION_LABELS[vm.rating] || ''; };

  var orderItemId = Number($routeParams.orderItemId);

  ordersService.mine().then(function (orders) {
    orders.forEach(function (order) {
      order.items.forEach(function (item) {
        if (item.order_item_id === orderItemId) {
          vm.item = angular.extend({}, item, { order_id: order.order_id });
        }
      });
    });
    vm.loading = false;
  });

  vm.setRating = function (n) { vm.rating = n; };

  vm.onFileSelected = function (files) {
    vm.file = files[0] || null;
    vm.preview = vm.file ? URL.createObjectURL(vm.file) : null;
  };

  vm.submit = function () {
    if (!vm.rating) {
      vm.errorMessage = 'Vui lòng chọn số sao đánh giá';
      return;
    }
    vm.errorMessage = null;
    vm.submitting = true;

    var formData = new FormData();
    formData.append('order_item_id', orderItemId);
    formData.append('rating', vm.rating);
    formData.append('content', vm.content);
    if (vm.file) formData.append('image', vm.file);

    reviewsService.create(formData).then(function () {
      vm.submitting = false;
      vm.phase = 'submitted';
      vm.submittedAt = new Date();
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không thể gửi đánh giá';
    });
  };
});
