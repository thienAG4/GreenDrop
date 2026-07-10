// Self-contained "Why choose GreenDrop?" section — no attributes needed,
// generates its own copy/images so it can be dropped onto any page.
angular.module('app').directive('gdValueProps', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/section-value-props.html',
    controllerAs: 'vm',
    controller: function (placeholderImagesService) {
      var images = placeholderImagesService.namedList(['delivery.png', 'offer.png', 'quality.png', 'support.png']);
      this.items = [
        { title: 'Miễn phí vận chuyển', description: 'Giao hàng nhanh chóng, sản phẩm đến tay bạn đúng hẹn và an toàn', cta: 'Tìm hiểu thêm', image: images[0] },
        { title: 'Ưu đãi độc quyền', description: 'Nhận những chương trình khuyến mãi hấp dẫn dành riêng cho bạn', cta: 'Xem ưu đãi', image: images[1] },
        { title: 'Cam kết chất lượng', description: 'Mỗi sản phẩm đều được tuyển chọn kỹ lưỡng để đảm bảo sự hài lòng của khách hàng', cta: 'Tìm hiểu thêm', image: images[2] },
        { title: 'Hỗ trợ khách hàng 24/7', description: 'Chúng tôi ở đây để hỗ trợ bạn bất kể ngày đêm', cta: 'Liên hệ ngay', image: images[3] },
      ];
    },
  };
});
