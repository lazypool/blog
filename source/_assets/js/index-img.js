(function () {
  'use strict';

  var ROOT = document.documentElement;
  var MOBILE_QUERY = '(max-width: 767px)';
  var ZOOM_RATIO = 1.1;

  function currentDpr() {
    return window.devicePixelRatio || 1;
  }

  var baselineDpr = currentDpr();
  var mobile = window.matchMedia(MOBILE_QUERY);

  function isZoomed() {
    var dprZoom = currentDpr() >= baselineDpr * ZOOM_RATIO;
    var pinchZoom = window.visualViewport && window.visualViewport.scale > 1.05;
    return dprZoom || pinchZoom;
  }

  function update() {
    ROOT.classList.toggle('index-img-hidden', mobile.matches || isZoomed());
  }

  var pending = false;
  function scheduleUpdate() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      update();
    });
  }

  mobile.addEventListener('change', scheduleUpdate);

  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleUpdate);
  }

  update();
})();
