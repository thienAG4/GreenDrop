angular.module('app').controller('SavedDesignsController', function (combosService) {
  var vm = this;
  vm.loading = true;
  vm.designs = [];

  combosService.mine().then(function (designs) {
    vm.designs = designs;
  }).finally(function () {
    vm.loading = false;
  });

  // Falls back to the first component's own product photo when the design has
  // no persisted AI preview (e.g. designs saved before that feature existed,
  // like the seeded "Combo Tối Giản Alice") - only the generic placeholder as
  // a last resort if even that's missing.
  vm.thumbnail = function (design) {
    if (design.images && design.images[0]) return design.images[0].url;
    var withImage = design.items.filter(function (i) { return i.image_url; })[0];
    return withImage ? withImage.image_url : 'https://placehold.co/400x300?text=%20';
  };
  vm.typeLabel = function (design) {
    return design.combo_type === '3d_builder' ? '3D Terrarium Studio' : 'AI Terrarium Builder';
  };

  var ROLE_LABELS = { pot: 'Chậu/bình', soil: 'Đất nền', plant: 'Cây', accessory: 'Phụ kiện' };
  var COUNTABLE_ROLES = { plant: true, accessory: true };
  // Short role+count summary instead of listing every individual product name
  // (e.g. "Chậu/bình, Đất nền, 2 Cây, Phụ kiện") - pot/soil aren't counted
  // since a design only ever has one of each conceptually, even when built
  // from more than one soil product.
  vm.summary = function (design) {
    var counts = {};
    var order = [];
    design.items.forEach(function (item) {
      if (!counts[item.component_role]) order.push(item.component_role);
      counts[item.component_role] = (counts[item.component_role] || 0) + 1;
    });
    return order.map(function (role) {
      var label = ROLE_LABELS[role] || role;
      var count = counts[role];
      return (COUNTABLE_ROLES[role] && count > 1) ? (count + ' ' + label) : label;
    }).join(', ');
  };
});
