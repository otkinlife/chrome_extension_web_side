chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "x-frame-options", operation: "remove" },
          { header: "content-security-policy", operation: "remove" },
        ],
      },
      condition: {
        urlFilter: "*",
        resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "websocket"],
      },
    },
  ],
});
