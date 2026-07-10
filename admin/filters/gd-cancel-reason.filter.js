// Admin shouldn't see internal/technical cancellation strings (e.g. the QR
// payment-expiry system message) - translate the known system-generated
// reasons into plain business-rule language. A customer's own selected
// cancellation reason is already human-readable Vietnamese and passes through.
angular.module('adminApp').filter('gdCancelReason', function () {
  var SYSTEM_REASONS = [
    { match: /payment window expired/i, label: 'Đơn hàng bị huỷ tự động do khách hàng không thanh toán trong thời gian quy định (tối đa 15 phút đối với thanh toán trực tuyến).' },
    { match: /payment gateway declined/i, label: 'Đơn hàng bị huỷ do cổng thanh toán từ chối giao dịch.' },
    { match: /^cancelled by admin$/i, label: 'Đơn hàng được huỷ bởi quản trị viên.' },
    { match: /^cancelled by customer$/i, label: 'Khách hàng đã huỷ đơn hàng.' },
  ];
  return function (reason) {
    if (!reason) return 'Không có';
    var found = SYSTEM_REASONS.filter(function (r) { return r.match.test(reason); })[0];
    return found ? found.label : reason;
  };
});
