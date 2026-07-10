angular.module('app').controller('AboutController', function (placeholderImagesService) {
  var vm = this;
  vm.heroImage = placeholderImagesService.named('about_us1.png');
  vm.videoPoster = placeholderImagesService.random();
  vm.testimonialImage = placeholderImagesService.named('customer_perspective.png');

  vm.testimonials = [
    { content: 'GreenDrop giúp mình có một góc xanh nhỏ xinh ngay trên bàn làm việc. Rất hài lòng!', name: 'Ckothuw' },
    { content: 'Terrarium đóng gói cẩn thận, cây tươi khoẻ khi nhận hàng. Sẽ ủng hộ tiếp!', name: 'Minh Anh' },
    { content: 'Dịch vụ tư vấn nhiệt tình, giao hàng nhanh. Không gian sống của mình xanh mát hẳn lên.', name: 'Hoàng Long' },
  ];
  vm.testimonialIndex = 0;
  vm.currentTestimonial = function () { return vm.testimonials[vm.testimonialIndex]; };
  vm.prevTestimonial = function () {
    vm.testimonialIndex = (vm.testimonialIndex - 1 + vm.testimonials.length) % vm.testimonials.length;
  };
  vm.nextTestimonial = function () {
    vm.testimonialIndex = (vm.testimonialIndex + 1) % vm.testimonials.length;
  };
});
