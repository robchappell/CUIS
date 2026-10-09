/**
 * Core UI System controller.
 * Appearance, theme, density, dialog, drawer, and tabs.
 * Does not set data-bs-theme or data-rc-theme.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute("data-cuis-theme", theme);
  }

  function setAppearance(appearance) {
    root.setAttribute("data-cuis-appearance", appearance);
  }

  function setDensity(density, target) {
    var node = target || root;
    if (node.setAttribute) node.setAttribute("data-cuis-density", density);
  }

  function toggleAppearance() {
    var next = root.getAttribute("data-cuis-appearance") === "dark" ? "light" : "dark";
    setAppearance(next);
    return next;
  }

  function selectTab(tab) {
    var group = tab.closest(".cuis-tabs");
    if (!group) return;
    group.querySelectorAll("[role='tab']").forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
      var panel = document.getElementById(item.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    });
  }

  function appearanceLabel(appearance) {
    return appearance === "dark" ? "Use light appearance" : "Use dark appearance";
  }

  document.addEventListener("click", function (event) {
    var appearanceButton = event.target.closest("[data-cuis-toggle-appearance]");
    if (appearanceButton) {
      var appearance = toggleAppearance();
      var word = appearance === "dark" ? "Light" : "Dark";
      var label = appearanceButton.querySelector(".cuis-button-label");
      if (label) label.textContent = word;
      else if (!appearanceButton.querySelector("svg")) appearanceButton.textContent = word;
      appearanceButton.setAttribute("aria-label", appearanceLabel(appearance));
    }

    var openButton = event.target.closest("[data-cuis-open]");
    if (openButton) {
      var dialog = document.getElementById(openButton.getAttribute("data-cuis-open"));
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    }

    var closeButton = event.target.closest("[data-cuis-close]");
    if (closeButton) {
      var host = closeButton.closest("dialog");
      if (host) host.close();
    }

    if (event.target instanceof HTMLDialogElement && event.target.open) {
      var rect = event.target.getBoundingClientRect();
      var inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) event.target.close();
    }

    var tab = event.target.closest("[role='tab']");
    if (tab) selectTab(tab);
  });

  document.addEventListener("change", function (event) {
    var themeSelect = event.target.closest("select[data-cuis-set-theme]");
    if (themeSelect) setTheme(themeSelect.value);
    var densitySelect = event.target.closest("select[data-cuis-set-density]");
    if (densitySelect) setDensity(densitySelect.value);
  });

  window.CUIS = {
    setTheme: setTheme,
    setAppearance: setAppearance,
    setDensity: setDensity,
  };
})();
