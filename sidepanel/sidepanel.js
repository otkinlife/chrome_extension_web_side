const iframeContainer = document.getElementById('underside-iframe-container');
const iframe = document.getElementById('underside-iframe-container');
const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const confirmButton = document.getElementById('confirm');

function sendEventToIframe(eventName, eventArgs) {
  console.debug('sendEventToIframe', eventName, JSON.stringify(eventArgs));
  iframe.contentWindow.postMessage({ eventName, eventArgs }, '*');
}

window.addEventListener('message', async function (event) {
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
  // 检查是否已存在相同的URL
  const existingTab = Array.from(document.querySelectorAll('.tab')).find(tab => tab.dataset.url === url);
  if (existingTab) {
    // 如果存在相同的URL，直接切换到该标签页
    switchTab(existingTab.dataset.id);
    return;
  }
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

  // 保存标签页信息到localStorage
  const tabs = JSON.parse(localStorage.getItem('tabs')) || {};
  tabs[url] = { id: tabCounter, title };
  localStorage.setItem('tabs', JSON.stringify(tabs));
}

// 获取网页的标题
function fetchTitle(url) {
  return fetch(url)
    .then(response => response.text())
    .then(html => {
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, "text/html");
      return doc.title;
    });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab, .iframe-container').forEach(element => {
    if (element.dataset.id === tabId) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
    localStorage.setItem('activeTabId', tabId);
  });
}

document.querySelector('.add-tab').addEventListener('click', function () {
  const dialog = document.getElementById('dialog');
  dialog.style.display = 'block';
});

// 检查输入框是否为空，如果为空则禁用确认按钮
function checkInputs() {
  if (!urlInput.value) {
    confirmButton.disabled = true;
    confirmButton.classList.add('disabled');
    confirmButton.classList.remove('enabled');
  } else {
    confirmButton.disabled = false;
    confirmButton.classList.remove('disabled');
    confirmButton.classList.add('enabled');
  }
}

// 添加 input 事件监听器
urlInput.addEventListener('input', checkInputs);
titleInput.addEventListener('input', checkInputs);

// 确认按钮的点击事件
confirmButton.addEventListener('click', function () {
  if (!confirmButton.disabled) {
    let url = urlInput.value;
    let t = titleInput.value;
    if (!isValidURL(url)) {
      document.getElementById('err_prompt').textContent = 'url invalid';
      return
    }
    if (!t) {
      fetchTitle(url).then(title => {
        createTab(url, title);
        switchTab(tabCounter.toString());
        // 清空输入框并隐藏对话框
        urlInput.value = '';
        titleInput.value = '';
        document.getElementById('dialog').style.display = 'none';
      })
        .catch(error => {
          console.error("An error occurred:", error);
        });;
    } 
  }
});

// 取消按钮的点击事件
document.getElementById('cancel').addEventListener('click', function () {
  // 清空输入框并隐藏对话框
  urlInput.value = '';
  titleInput.value = '';
  confirmButton.disabled = true;
  confirmButton.classList.add('disabled');
  confirmButton.classList.remove('enabled');
  document.getElementById('dialog').style.display = 'none';
});


document.addEventListener('click', function (e) {
  if (e.target.className === 'close-tab') {
    const tabId = e.target.parentNode.dataset.id;
    document.querySelector(`.tab[data-id="${tabId}"]`).remove();
    document.querySelector(`.iframe-container[data-id="${tabId}"]`).remove();

    // 从localStorage中删除标签页信息
    const tabs = JSON.parse(localStorage.getItem('tabs')) || {};
    if (tabs.hasOwnProperty(tabId)) {
      delete tabs[tabId];
      localStorage.setItem('tabs', JSON.stringify(tabs));
    }
  } else if (e.target.classList.contains('tab')) {
    switchTab(e.target.dataset.id);
  }
});

// 在页面加载时，恢复localStorage中保存的标签页
window.addEventListener('load', function () {
  const tabs = JSON.parse(localStorage.getItem('tabs')) || {};
  for (let url in tabs) {
    createTab(url, tabs[url].title);
  }
  // 在页面加载时，恢复localStorage中保存的选中标签页
  const activeTabId = localStorage.getItem('activeTabId');
  if (activeTabId) {
    switchTab(activeTabId);
  }
});

function isValidURL(url) {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
    "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
    "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
    "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
    "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
    "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return pattern.test(url);
}