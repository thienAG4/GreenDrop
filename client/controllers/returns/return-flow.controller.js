angular.module('app').controller('ReturnFlowController', function ($routeParams, $q, $location, ordersService, returnsService) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.eligibleItems = [];
  vm.selectedItem = null;
  vm.existingReturn = null;
  vm.myReturns = [];
  vm.phase = 'select-item'; // select-item -> request -> confirmation -> (derived from server status)

  // Same wording as order-detail.controller.js's payment method picker.
  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)',
    credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  vm.paymentMethodLabel = function () {
    return vm.order ? (PAYMENT_METHOD_LABELS[vm.order.payment_method] || vm.order.payment_method) : '';
  };

  vm.reasonOptions = [
    { value: 'damaged', label: 'Sản phẩm bị hư hỏng/vỡ (trong 48h)' },
    { value: 'wrong_item', label: 'Giao sai sản phẩm (trong 48h)' },
    { value: 'shipping_error', label: 'Lỗi vận chuyển (trong 48h)' },
    { value: 'defective', label: 'Sản phẩm lỗi/cây chết (trong 7 ngày)' },
    { value: 'not_as_described', label: 'Không đúng mô tả (trong 7 ngày)' },
  ];
  vm.form = { order_item_id: null, reason_type: '', description: '' };
  vm.reasonLabel = function (reasonType) {
    var opt = vm.reasonOptions.filter(function (o) { return o.value === reasonType; })[0];
    return opt ? opt.label : reasonType;
  };
  vm.files = [];
  vm.previews = [];
  vm.submitting = false;
  vm.errorMessage = null;
  vm.priorRejectReason = null;

  vm.trackingForm = { carrier: 'GHTK', tracking_number: '' };

  // Latest non-rejected return covering this order item, from the preloaded
  // list. A rejected request doesn't count (the customer may resubmit), but a
  // completed one does - its timeline must stay viewable.
  function findExistingReturn(orderItemId) {
    var active = vm.myReturns.filter(function (r) {
      return r.items.some(function (i) { return i.order_item_id === orderItemId; }) && r.status !== 'rejected';
    });
    return active.length ? active[active.length - 1] : null;
  }

  function hasReturn(orderItemId) {
    return vm.myReturns.some(function (r) {
      return r.items.some(function (i) { return i.order_item_id === orderItemId; }) && r.status !== 'rejected';
    });
  }

  $q.all([ordersService.get($routeParams.id), returnsService.mine()]).then(function (res) {
    vm.order = res[0];
    vm.myReturns = res[1];
    // Show an item if it can still start a return (not yet returned) OR it
    // already has a (non-rejected) return whose progress the customer should
    // keep seeing. Without the second clause, once admin marks the item
    // received (is_returned -> TRUE) the whole return would vanish from this page.
    vm.eligibleItems = vm.order.items.filter(function (i) {
      return !i.is_returned || hasReturn(i.order_item_id);
    });
    vm.loading = false;

    if (vm.eligibleItems.length === 1) {
      vm.chooseItem(vm.eligibleItems[0]);
    }
  });

  vm.chooseItem = function (item) {
    vm.selectedItem = item;
    vm.form.order_item_id = item.order_item_id;
    var existing = findExistingReturn(item.order_item_id);
    vm.existingReturn = existing;
    vm.phase = existing ? 'timeline' : 'request';
  };

  vm.onFilesSelected = function (files) {
    vm.files = Array.prototype.slice.call(files);
    vm.previews = vm.files.map(function (f) { return URL.createObjectURL(f); });
  };

  vm.removeFile = function (index) {
    vm.files.splice(index, 1);
    vm.previews.splice(index, 1);
  };

  vm.submitRequest = function () {
    if (!vm.form.reason_type) {
      vm.errorMessage = 'Vui lòng chọn lý do trả hàng';
      return;
    }
    if (!vm.files.length) {
      vm.errorMessage = 'Vui lòng tải lên ít nhất một hình ảnh minh chứng';
      return;
    }
    vm.errorMessage = null;
    vm.submitting = true;

    var formData = new FormData();
    formData.append('order_item_id', vm.form.order_item_id);
    formData.append('reason_type', vm.form.reason_type);
    formData.append('description', vm.form.description);
    vm.files.forEach(function (file) { formData.append('evidence', file); });

    returnsService.create(formData).then(function (returnRequest) {
      vm.submitting = false;
      vm.existingReturn = returnRequest;
      vm.phase = 'confirmation';
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không thể gửi yêu cầu trả hàng';
    });
  };

  vm.viewStatus = function () {
    vm.phase = 'timeline';
  };

  vm.resubmit = function () {
    // Carries the admin's rejection note forward as context on the
    // resubmission form (DESIGNS.md 3.6.2 stage 6 "Adding More Information") -
    // otherwise it's lost the moment vm.existingReturn gets replaced below.
    vm.priorRejectReason = vm.existingReturn.reject_reason;
    vm.form = { order_item_id: vm.selectedItem.order_item_id, reason_type: '', description: '' };
    vm.files = [];
    vm.previews = [];
    vm.phase = 'request';
  };

  // A rejection that happens after the customer already shipped the item
  // (tracking_number set) means the warehouse received it and failed it on
  // inspection - distinct from an initial pre-shipment review rejection, even
  // though both currently share the same 'rejected' status (see
  // returns.service.js#rejectReturn, which allows rejecting an already-
  // approved request for exactly this case).
  vm.isInspectionFailure = function () {
    return vm.existingReturn && vm.existingReturn.status === 'rejected' && !!vm.existingReturn.tracking_number;
  };

  vm.responseDeadline = function () {
    if (!vm.existingReturn) return null;
    return new Date(new Date(vm.existingReturn.created_at).getTime() + 48 * 60 * 60 * 1000);
  };

  // Which of the 4 return stages (1 Đã gửi, 2 Xét duyệt, 3 Nhận hàng,
  // 4 Hoàn tiền) is currently active. Returns 5 when everything is finished so
  // every stage renders as done. Drives the always-visible progress stepper so
  // the customer can see where the return is at any point, not just right after
  // submitting.
  vm.currentStage = function () {
    var r = vm.existingReturn;
    if (!r) return 0;
    if (r.status === 'pending') return 2;
    if (r.status === 'approved') return 3;
    if (r.status === 'completed') {
      var refund = vm.latestRefund();
      return refund && refund.status === 'completed' ? 5 : 4;
    }
    return 0; // rejected has its own dedicated screen, no stepper
  };

  vm.stepState = function (stage) {
    var current = vm.currentStage();
    return stage < current ? 'done' : (stage === current ? 'active' : '');
  };

  vm.submitTracking = function () {
    returnsService.submitTracking(vm.existingReturn.return_id, vm.trackingForm.tracking_number).then(function (r) {
      vm.existingReturn = r;
    });
  };

  vm.latestRefund = function () {
    if (!vm.existingReturn || !vm.existingReturn.refunds.length) return null;
    return vm.existingReturn.refunds[vm.existingReturn.refunds.length - 1];
  };

  vm.copyAddress = function () {
    var address = 'GreenDrop Warehouse, 123 Vo Van Ngan, Thu Duc, TP. Ho Chi Minh';
    if (navigator.clipboard) navigator.clipboard.writeText(address);
    vm.addressCopied = true;
  };
});
