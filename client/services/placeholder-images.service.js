// Filenames snapshotted from backend/uploads/images/ on 2026-07-09 (excludes
// product_imgs.json, which is the separate 164-product catalog import and
// not meant for use here). There is no backend endpoint that lists this
// folder dynamically, so update this array by hand if files are added,
// removed, or renamed — this is the single place to look/edit those URLs.
angular.module('app').factory('placeholderImagesService', function () {
  var BASE_URL = 'http://localhost:4000/uploads/images/';
  var FILENAMES = [
    'assessories_1.png', 'assessories_2.png',
    'v629_13433.png', 'v629_13442.png', 'v629_13446.png', 'v629_13453.png',
    'v629_13463.png', 'v629_13471.png', 'v629_13479.png', 'v629_13487.png',
    'v629_13517.png', 'v629_13542.png', 'v629_13548.png', 'v629_13559.png',
    'v629_13585.png', 'v629_13611.png', 'v629_13637.png', 'v629_13663.png',
    'v629_13689.png', 'v629_13709.png', 'v629_13734.png', 'v629_13743.png',
    'v629_13747.png', 'v629_13754.png', 'v629_13764.png', 'v629_13772.png',
    'v629_13780.png', 'v629_13788.png', 'v629_13818.png', 'v629_13843.png',
    'v629_13849.png', 'v629_13860.png', 'v629_13886.png', 'v629_13912.png',
    'v629_13938.png', 'v629_13964.png', 'v629_13990.png', 'v629_14010.png',
    'v629_14063.png', 'v629_14064.png', 'v629_14065.png', 'v629_14066.png',
    'v629_14080.png', 'v629_14092.png', 'v629_14105.png', 'v629_14106.png',
    'v629_14107.png', 'v629_14108.png', 'v629_14143.png', 'v629_14146.png',
    'v629_14149.png', 'v629_14153.png', 'v629_14156.png',
  ];

  function urlFor(filename) {
    return BASE_URL + filename;
  }

  function random() {
    return urlFor(FILENAMES[Math.floor(Math.random() * FILENAMES.length)]);
  }

  // Distinct random images (shuffle-and-slice), for sections needing several.
  function randomN(n) {
    var pool = FILENAMES.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, Math.min(n, pool.length)).map(urlFor);
  }

  // A specific, purpose-picked file (e.g. 'hero-image.jpg') rather than a
  // random pick from FILENAMES - used where the design calls for one exact image.
  function named(filename) {
    return urlFor(filename);
  }

  // Same as named(), for an ordered list of specific files.
  function namedList(filenames) {
    return filenames.map(urlFor);
  }

  return { BASE_URL: BASE_URL, random: random, randomN: randomN, named: named, namedList: namedList };
});
