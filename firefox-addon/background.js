browser.browserAction.onClicked.addListener(async (tab) => {
  try {
    await browser.tabs.executeScript(tab.id, { file: "content-script.js" });
  } catch (err) {
    // Privileged pages (about:*, addons.mozilla.org, etc.) block injection
    setBadge("!", "#cc0000", tab.id);
  }
});

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "pdf-count") {
    const tabId = sender.tab.id;
    if (msg.count > 0) {
      setBadge(String(msg.count), "#22863a", tabId);
    } else {
      setBadge("0", "#888888", tabId);
    }
  }
});

function setBadge(text, color, tabId) {
  browser.browserAction.setBadgeText({ text, tabId });
  browser.browserAction.setBadgeBackgroundColor({ color, tabId });

  // Clear badge after 4 seconds
  setTimeout(() => {
    browser.browserAction.setBadgeText({ text: "", tabId });
  }, 4000);
}
