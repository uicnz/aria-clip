(() => {
  // src/entrypoints/safari-app.ts
  function first(selector) {
    return document.querySelector(selector);
  }
  function text(selector, value) {
    const element = first(selector);
    if (element)
      element.innerText = value;
  }
  function show(platform, enabled, useSettings) {
    document.body.classList.add(`platform-${platform}`);
    if (useSettings) {
      text(".platform-mac.state-on", "Aria Clip is currently on. You can turn it off in the Extensions section of Safari Settings.");
      text(".platform-mac.state-off", "Aria Clip is currently off. You can turn it on in the Extensions section of Safari Settings.");
      text(".platform-mac.state-unknown", "You can turn on Aria Clip in the Extensions section of Safari Settings.");
      text(".platform-mac.open-preferences", "Close and Open Safari Settings…");
    }
    if (typeof enabled === "boolean") {
      document.body.classList.toggle("state-on", enabled);
      document.body.classList.toggle("state-off", !enabled);
    } else {
      document.body.classList.remove("state-on", "state-off");
    }
  }
  function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
  }
  first("button.open-preferences")?.addEventListener("click", openPreferences);
  Object.assign(globalThis, { show });
})();
