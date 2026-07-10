// Multipart image upload, shared by products/banners/blog admin forms so
// each one just picks the right subfolder instead of re-implementing this.
angular.module('adminApp').factory('uploadsService', function ($http, API_BASE_URL) {
  function uploadImages(subfolder, files) {
    var formData = new FormData();
    angular.forEach(files, function (file) { formData.append('images', file); });
    return $http.post(API_BASE_URL + '/uploads/' + subfolder, formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: angular.identity,
    }).then(function (res) { return res.data.data; });
  }
  return { uploadImages: uploadImages };
});
