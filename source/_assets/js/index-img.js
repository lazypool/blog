(function () {
  'use strict';

  var ROOT = document.documentElement;
  var MOBILE_QUERY = '(max-width: 767px)';
  var ZOOM_RATIO = 1.1;
  var STORAGE_PREFIX = 'fluid-index-img-min-dpr:';

  function currentDpr() {
    return window.devicePixelRatio || 1;
  }

  function screenKey() {
    var screen = window.screen || {};
    return STORAGE_PREFIX + (screen.width || 0) + 'x' + (screen.height || 0);
  }

  function readBaselineDpr() {
    var dpr = currentDpr();
    var baseline = dpr;
    try {
      var stored = parseFloat(window.localStorage.getItem(screenKey()));
      if (isFinite(stored) && stored > 0 && stored < baseline) {
        baseline = stored;
      }
      window.localStorage.setItem(screenKey(), String(baseline));
    } catch (e) {
    }
    return baseline;
  }

  var baselineDpr = readBaselineDpr();
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

  if (typeof mobile.addEventListener === 'function') {
    mobile.addEventListener('change', scheduleUpdate);
  } else if (typeof mobile.addListener === 'function') {
    mobile.addListener(scheduleUpdate);
  }

  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleUpdate);
  }

  update();
})();
