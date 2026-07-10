// Backed by the real BLOG_POSTS table (see create_database.sql) - shaped to
// match the fields the blog views already expect (image/date/content-as-
// paragraphs) so this can drop in for the old hardcoded staticContentService.
angular.module('app').factory('blogService', function ($http, API_BASE_URL) {
  function toArticle(post) {
    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      image: post.image_url,
      author: post.author,
      date: post.created_at,
      content: (post.content || '').split('\n\n'),
    };
  }

  function list() {
    return $http.get(API_BASE_URL + '/blog').then(function (res) { return res.data.data.map(toArticle); });
  }
  function getBySlug(slug) {
    return $http.get(API_BASE_URL + '/blog/' + slug).then(function (res) { return toArticle(res.data.data); });
  }

  return { list: list, getBySlug: getBySlug };
});
