// Thin wrapper around Chart.js (loaded via CDN, no build step) so dashboard
// controllers can just hand it a type/data/options object instead of every
// page hand-rolling its own canvas lifecycle management.

// Global look-and-feel so every gd-chart instance matches the app's design
// tokens (tokens.css) without every controller repeating the same options.
if (window.Chart) {
  Chart.defaults.font.family = "'Nunito Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#7F8C8D';
  Chart.defaults.plugins.tooltip.backgroundColor = '#1B2F23';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '700' };
  Chart.defaults.plugins.tooltip.displayColors = false;
}

angular.module('adminApp').directive('gdChart', function () {
  return {
    restrict: 'E',
    scope: { type: '=', data: '=', options: '=' },
    template: '<canvas></canvas>',
    link: function (scope, element) {
      var canvas = element.find('canvas')[0];
      var chart = null;

      var DEFAULT_OPTIONS = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
      };

      function render() {
        if (!scope.data) return;
        if (chart) chart.destroy();
        chart = new Chart(canvas.getContext('2d'), {
          type: scope.type || 'line',
          data: scope.data,
          options: angular.merge({}, DEFAULT_OPTIONS, scope.options || {}),
        });
      }

      scope.$watch('data', render, true);

      scope.$on('$destroy', function () {
        if (chart) chart.destroy();
      });
    },
  };
});
