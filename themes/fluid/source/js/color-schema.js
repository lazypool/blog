/* global Fluid */

/**
 * Modified from https://blog.skk.moe/post/hello-darkmode-my-old-friend/
 */
(function(window, document) {
  var rootElement = document.documentElement;
  var colorSchemaStorageKey = 'Fluid_Color_Scheme';
  var colorSchemaMediaQueryKey = '--color-mode';
  var userColorSchemaAttributeName = 'data-user-color-scheme';
  var defaultColorSchemaAttributeName = 'data-default-color-scheme';
  var colorToggleButtonSelector = '#color-toggle-btn';
  var colorToggleIconSelector = '#color-toggle-icon';
  var iframeSelector = 'iframe';

  function setLS(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  }

  function removeLS(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  }

  function getLS(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }

  function getSchemaFromHTML() {
    var res = rootElement.getAttribute(defaultColorSchemaAttributeName);
    if (typeof res === 'string') {
      return res.replace(/["'\s]/g, '');
    }
    return null;
  }

  function getSchemaFromCSSMediaQuery() {
    var res = getComputedStyle(rootElement).getPropertyValue(
      colorSchemaMediaQueryKey
    );
    if (typeof res === 'string') {
      return res.replace(/["'\s]/g, '');
    }
    return null;
  }

  function resetSchemaAttributeAndLS() {
    rootElement.setAttribute(userColorSchemaAttributeName, getDefaultColorSchema());
    removeLS(colorSchemaStorageKey);
  }

  var validColorSchemaKeys = {
    dark : true,
    light: true
  };

  function getDefaultColorSchema() {
    // Get default value from HTML attribute
    var schema = getSchemaFromHTML();
    // Return if explicitly specified
    if (validColorSchemaKeys[schema]) {
      return schema;
    }
    // Prefer prefers-color-scheme
    schema = getSchemaFromCSSMediaQuery();
    if (validColorSchemaKeys[schema]) {
      return schema;
    }
    // Fall back to time-based: after 18:00 or between 00:00-06:00 use dark
    var hours = new Date().getHours();
    if (hours >= 18 || (hours >= 0 && hours <= 6)) {
      return 'dark';
    }
    return 'light';
  }

  function applyCustomColorSchemaSettings(schema) {
    // Accept mode from toggle button, or read from localStorage, or use default
    var current = schema || getLS(colorSchemaStorageKey) || getDefaultColorSchema();

    if (current === getDefaultColorSchema()) {
      // Reset to auto mode when user's choice matches the default
      resetSchemaAttributeAndLS();
    } else if (validColorSchemaKeys[current]) {
      rootElement.setAttribute(
        userColorSchemaAttributeName,
        current
      );
    } else {
      // Reset on invalid value
      resetSchemaAttributeAndLS();
      return;
    }

    // Set toggle button icon
    setButtonIcon(current);

    // Set code highlight style
    setHighlightCSS(current);

    // Set other applications
    setApplications(current);
  }

  var invertColorSchemaObj = {
    dark : 'light',
    light: 'dark'
  };

  function getIconClass(scheme) {
    return 'icon-' + scheme;
  }

  function toggleCustomColorSchema() {
    var currentSetting = getLS(colorSchemaStorageKey);

    if (validColorSchemaKeys[currentSetting]) {
      // Read mode from localStorage and invert it
      currentSetting = invertColorSchemaObj[currentSetting];
    } else if (currentSetting === null) {
      // When localStorage has no value or throws Error
      // Switch based on current button state
      var iconElement = document.querySelector(colorToggleIconSelector);
      if (iconElement) {
        currentSetting = iconElement.getAttribute('data');
      }
      if (!iconElement || !validColorSchemaKeys[currentSetting]) {
        // When localStorage has no value or throws Error, read default and invert
        currentSetting = invertColorSchemaObj[getSchemaFromCSSMediaQuery()];
      }
    } else {
      return;
    }
    // Write inverted mode to localStorage
    setLS(colorSchemaStorageKey, currentSetting);

    return currentSetting;
  }

  function setButtonIcon(schema) {
    if (validColorSchemaKeys[schema]) {
      // Toggle icon
      var icon = getIconClass('dark');
      if (schema) {
        icon = getIconClass(schema);
      }
      var iconElement = document.querySelector(colorToggleIconSelector);
      if (iconElement) {
        iconElement.setAttribute(
          'class',
          'iconfont ' + icon
        );
        iconElement.setAttribute(
          'data',
          invertColorSchemaObj[schema]
        );
      } else {
        // Icon not loaded yet, wait for full page load
        Fluid.utils.waitElementLoaded(colorToggleIconSelector, function() {
          var iconElement = document.querySelector(colorToggleIconSelector);
          if (iconElement) {
            iconElement.setAttribute(
              'class',
              'iconfont ' + icon
            );
            iconElement.setAttribute(
              'data',
              invertColorSchemaObj[schema]
            );
          }
        });
      }
      if (document.documentElement.getAttribute('data-user-color-scheme')) {
        var color = getComputedStyle(document.documentElement).getPropertyValue('--navbar-bg-color').trim()
        document.querySelector('meta[name="theme-color"]').setAttribute('content', color)
      }
    }
  }

  function setHighlightCSS(schema) {
    // Enable corresponding code highlight style
    var lightCss = document.getElementById('highlight-css');
    var darkCss = document.getElementById('highlight-css-dark');
    if (schema === 'dark') {
      if (darkCss) {
        darkCss.removeAttribute('disabled');
      }
      if (lightCss) {
        lightCss.setAttribute('disabled', '');
      }
    } else {
      if (lightCss) {
        lightCss.removeAttribute('disabled');
      }
      if (darkCss) {
        darkCss.setAttribute('disabled', '');
      }
    }

    setTimeout(function() {
      // Set code block widget style
      document.querySelectorAll('.markdown-body pre').forEach((pre) => {
        var cls = Fluid.utils.getBackgroundLightness(pre) >= 0 ? 'code-widget-light' : 'code-widget-dark';
        var widget = pre.querySelector('.code-widget-light, .code-widget-dark');
        if (widget) {
          widget.classList.remove('code-widget-light', 'code-widget-dark');
          widget.classList.add(cls);
        }
      });
    }, 200);
  }

  function setApplications(schema) {
    // Set remark42 comment theme
    if (window.REMARK42) {
      window.REMARK42.changeTheme(schema);
    }

    // Set cusdis comment theme
    if (window.CUSDIS) {
      window.CUSDIS.setTheme(schema);
    }

    // Set utterances comment theme
    var utterances = document.querySelector('.utterances-frame');
    if (utterances) {
      var utterancesTheme = schema === 'dark' ? window.UtterancesThemeDark : window.UtterancesThemeLight;
      const message = {
        type : 'set-theme',
        theme: utterancesTheme
      };
      utterances.contentWindow.postMessage(message, 'https://utteranc.es');
    }

    // Set giscus comment theme
    var giscus = document.querySelector('iframe.giscus-frame');
    if (giscus) {
      var giscusTheme = schema === 'dark' ? window.GiscusThemeDark : window.GiscusThemeLight;
      const message = {
        setConfig: {
          theme: giscusTheme,
        }
      };
      // giscus.style.cssText += 'color-scheme: normal;';
      giscus.contentWindow.postMessage({ 'giscus': message }, 'https://giscus.app');
    }
  }

  // Set display mode to custom value from localStorage on page load
  applyCustomColorSchemaSettings();

  Fluid.utils.waitElementLoaded(colorToggleIconSelector, function() {
    applyCustomColorSchemaSettings();
    var button = document.querySelector(colorToggleButtonSelector);
    if (button) {
      // On toggle button click, get new mode, write to localStorage, and apply
      button.addEventListener('click', function() {
        applyCustomColorSchemaSettings(toggleCustomColorSchema());
      });
      var icon = document.querySelector(colorToggleIconSelector);
      if (icon) {
        // Toggle icon on hover
        button.addEventListener('mouseenter', function() {
          var current = icon.getAttribute('data');
          icon.classList.replace(getIconClass(invertColorSchemaObj[current]), getIconClass(current));
        });
        button.addEventListener('mouseleave', function() {
          var current = icon.getAttribute('data');
          icon.classList.replace(getIconClass(current), getIconClass(invertColorSchemaObj[current]));
        });
      }
    }
  });

  Fluid.utils.waitElementLoaded(iframeSelector, function() {
    applyCustomColorSchemaSettings();
  });

})(window, document);
