const urlInput = document.getElementById('url-input');
const visitBtn = document.getElementById('visit-btn');
const iframeContainer = document.getElementById('underside-iframe-container');
const iframe = document.getElementById('underside-iframe-container');
const firstTimeGuide = document.getElementById('first-time-guide');

function checkFirstTime() {
  const isFirstTime = localStorage.getItem('isFirstTime');
  if (!isFirstTime) {
    firstTimeGuide.style.display = 'block';
    localStorage.setItem('isFirstTime', 'false');
  }
}

function openUrlInIframe(url) {
  iframeContainer.src = url;
}

visitBtn.addEventListener('click', () => {
  let url = urlInput.value;
  url = ensureHttps(url);
  openUrlInIframe(url);
  firstTimeGuide.style.display = 'none';
});

urlInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    let url = urlInput.value;
    url = ensureHttps(url);
    openUrlInIframe(url);
    firstTimeGuide.style.display = 'none';
  }
});

function ensureHttps(url) {
  if (!url.startsWith('http://')) {
    return 'http://' + url;
  }
  return url;
}

function sendEventToIframe(eventName, eventArgs) {
  console.debug('sendEventToIframe', eventName, JSON.stringify(eventArgs));
  iframe.contentWindow.postMessage({ eventName, eventArgs }, '*');
}

window.addEventListener('message', async function(event) {
  console.debug('onMessage', event.data.eventName, JSON.stringify(event.data.eventArgs));
  const eventName = event.data.eventName;

  if (eventName === 'Discover.Chat.Interact.Req') {
    sendEventToIframe('Discover.Chat.Interact.Rep', { status: true });
  } else if (eventName === 'Discover.Chat.Consent.Req') {
    sendEventToIframe('Discover.Chat.Consent.Rep', { text: 'Accepted' });
  } else if (eventName === 'Discover.Chat.Page.GetData') {
    const activeTab = await getActiveTab();
    const pageData = await chrome.tabs.sendMessage(activeTab.id, { action: 'get' });
    sendEventToIframe('Discover.Chat.Page', { text: pageData.text });
  } else if (eventName === 'Discover.Ready') {
    sendEventToIframe('Discover.VisibilityState', { isShow: true, timeStamp: Date.now() });
    sendEventToIframe('Discover.Tab.Click', { tabName: 'chat', clientLevel: 'window' });
    const activeTab = await getActiveTab();
    activeTab && sendEventToIframe('Discover.Client.TabStripModelChange', { eventType: 'Activate', tabInfo: buildActiveTabInfo(activeTab) });
  }
}, false);

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function buildActiveTabInfo(tab) {
  return {
    serpQuery: '',
    isActive: true,
    tabId: '',
    windowId: '',
    groupId: '',
    windowType: '',
    isLoading: false,
    title: tab.title,
    url: tab.url,
    pageLanguage: ''
  };
}

// 新添加的代码
checkFirstTime();