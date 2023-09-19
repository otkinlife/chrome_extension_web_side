const iframeContainer = document.getElementById('underside-iframe-container');
const iframe = document.getElementById('underside-iframe-container');
const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const confirmButton = document.getElementById('confirm');

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

let tabCounter = 1;

function createTab(url, title) {
  tabCounter++;
  const newTab = document.createElement('div');
  newTab.className = 'tab';
  newTab.dataset.id = tabCounter;
  newTab.innerHTML = `<span class="tab-title">${title}</span><img class="close-tab" src="../close.png" alt="Close Tab" />`;
  document.querySelector('.tabs-bar').insertBefore(newTab, document.querySelector('.add-tab'));

  const newIframeContainer = document.createElement('div');
  newIframeContainer.className = 'iframe-container';
  newIframeContainer.dataset.id = tabCounter;
  newIframeContainer.innerHTML = `<iframe frameborder="0" allow="clipboard-write" src="${url}"></iframe>`;
  document.querySelector('.iframes').appendChild(newIframeContainer);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab, .iframe-container').forEach(element => {
    if (element.dataset.id === tabId) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  });
}

document.querySelector('.add-tab').addEventListener('click', function () {
  const dialog = document.getElementById('dialog');
  dialog.style.display = 'block';
});

// 检查输入框是否为空，如果为空则禁用确认按钮
function checkInputs() {
  if (!urlInput.value || !titleInput.value) {
    confirmButton.disabled = true;
  } else {
    confirmButton.disabled = false;
  }
}

// 添加 input 事件监听器
urlInput.addEventListener('input', checkInputs);
titleInput.addEventListener('input', checkInputs);

// 确认按钮的点击事件
confirmButton.addEventListener('click', function () {
  if (!confirmButton.disabled) {
    createTab(urlInput.value, titleInput.value);
    switchTab(tabCounter.toString());
    // 清空输入框并隐藏对话框
    urlInput.value = '';
    titleInput.value = '';
    document.getElementById('dialog').style.display = 'none';
  }
});

// 取消按钮的点击事件
document.getElementById('cancel').addEventListener('click', function () {
  // 清空输入框并隐藏对话框
  urlInput.value = '';
  titleInput.value = '';
  document.getElementById('dialog').style.display = 'none';
});


document.addEventListener('click', function (e) {
  if (e.target.className === 'close-tab') {
    const tabId = e.target.parentNode.dataset.id;
    document.querySelector(`.tab[data-id="${tabId}"]`).remove();
    document.querySelector(`.iframe-container[data-id="${tabId}"]`).remove();
  } else if (e.target.classList.contains('tab')) {
    switchTab(e.target.dataset.id);
  }
});