// ===== ОБЪЯВЛЕНИЕ ПЕРЕМЕННЫХ =====
let currentToast = null;
let originalTexts = new Map();
let adaptedTexts = new Map();
let adaptedElements = [];
let isPageSimplified = false;

// ===== ВОССТАНОВЛЕНИЕ ПРИ ОБНОВЛЕНИИ СТРАНИЦЫ =====
if (sessionStorage.getItem('simpa_adapted') === 'true') {
  (function restoreOriginalPage() {
    for (const [el, originalText] of originalTexts) {
      el.innerText = originalText;
    }
    originalTexts.clear();
    adaptedTexts.clear();
    adaptedElements = [];
    sessionStorage.removeItem('simpa_adapted');
    isPageSimplified = false;
    console.log('🔄 Оригинальный текст восстановлен');
  })();
}

console.log('✅ content.js загружен и готов к работе');

// ===== Функции для тостов =====
function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

function getTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['theme'], (result) => {
      resolve(result.theme || 'dark');
    });
  });
}

function formatText(text) {
  let formatted = text.replace(/\n/g, '<br>');
  formatted = formatted.replace(/\n\n/g, '<br><br>');
  formatted = formatted.replace(/^\- (.*?)$/gm, '• $1');
  return formatted;
}

async function showToast(message, isError = false) {
  if (currentToast) currentToast.remove();
  const rect = getSelectionRect();
  if (!rect) return;
  const theme = await getTheme();
  const toast = document.createElement('div');
  toast.className = 'simpa-toast';
  if (theme === 'light') toast.classList.add('light');
  const formattedMessage = formatText(message);
  toast.innerHTML = `
    <button class="simpa-toast-close">&times;</button>
    <div class="simpa-toast-icon">${isError ? '⚠️' : '✨'}</div>
    <div class="simpa-toast-content">
      <div class="simpa-toast-text">${formattedMessage}</div>
      <button class="simpa-toast-copy">📋 Копировать</button>
    </div>
  `;
  document.body.appendChild(toast);
  currentToast = toast;
  positionToast(toast);
  toast.querySelector('.simpa-toast-close').addEventListener('click', () => {
    toast.remove();
    currentToast = null;
  });
  toast.querySelector('.simpa-toast-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      const copyBtn = toast.querySelector('.simpa-toast-copy');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ Скопировано!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    } catch (err) {
      const copyBtn = toast.querySelector('.simpa-toast-copy');
      copyBtn.textContent = '❌ Ошибка';
      setTimeout(() => {
        copyBtn.textContent = '📋 Копировать';
      }, 1500);
    }
  });
}

async function showLoadingToast(modeName) {
  if (currentToast) currentToast.remove();
  const rect = getSelectionRect();
  if (!rect) return;
  const theme = await getTheme();
  const toast = document.createElement('div');
  toast.className = 'simpa-toast simpa-toast-loading';
  if (theme === 'light') toast.classList.add('light');
  toast.innerHTML = `
    <div class="simpa-toast-icon">🤖</div>
    <div class="simpa-toast-text">${escapeHtml(modeName)}<span class="simpa-dots"></span></div>
  `;
  document.body.appendChild(toast);
  currentToast = toast;
  positionToast(toast);
}

function positionToast(toast) {
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '999999';
}

function updateToastPosition() {
  if (!currentToast) return;
  const rect = getSelectionRect();
  if (rect) positionToast(currentToast);
}

window.addEventListener('scroll', updateToastPosition);
window.addEventListener('resize', updateToastPosition);

function hideLoading() {
  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== ПОКАЗАТЬ ТОСТ В ЦЕНТРЕ ЭКРАНА =====
async function showCenteredToast(message, buttonText = null, buttonAction = null) {
  if (currentToast) currentToast.remove();
  
  const theme = await getTheme();
  const toast = document.createElement('div');
  toast.className = 'simpa-toast simpa-toast-centered';
  if (theme === 'light') toast.classList.add('light');
  
  let buttonsHtml = '';
  if (buttonText && buttonAction) {
    buttonsHtml = `<button class="simpa-toast-copy" id="centeredToastBtn">${buttonText}</button>`;
  }
  
  toast.innerHTML = `
    <button class="simpa-toast-close">&times;</button>
    <div class="simpa-toast-icon">✅</div>
    <div class="simpa-toast-content">
      <div class="simpa-toast-text">${escapeHtml(message)}</div>
      ${buttonsHtml}
    </div>
  `;
  
  document.body.appendChild(toast);
  currentToast = toast;
  
  // Центрируем
  toast.style.position = 'fixed';
  toast.style.top = '50%';
  toast.style.left = '50%';
  toast.style.transform = 'translate(-50%, -50%)';
  
  toast.querySelector('.simpa-toast-close').addEventListener('click', () => {
    toast.remove();
    currentToast = null;
  });
  
  if (buttonText && buttonAction) {
    toast.querySelector('#centeredToastBtn').addEventListener('click', () => {
      buttonAction();
      toast.remove();
      currentToast = null;
    });
  }
}

// ===== ВРЕМЕННОЕ УВЕДОМЛЕНИЕ =====
async function showTemporaryNotification(message) {
  const rect = getSelectionRect();
  
  const theme = await getTheme();
  const notification = document.createElement('div');
  notification.className = 'simpa-toast';
  if (theme === 'light') notification.classList.add('light');
  
  notification.innerHTML = `
    <div class="simpa-toast-icon">🔄</div>
    <div class="simpa-toast-content">
      <div class="simpa-toast-text">${escapeHtml(message)}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  positionToast(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(10px)';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ===== АДАПТАЦИЯ СТРАНИЦЫ =====
function shouldIgnore(el) {
  const ignoreClasses = [
    'nav', 'menu', 'header', 'footer', 'sidebar', 'comment', 
    'widget', 'social', 'share', 'ad', 'advertisement', 'popup',
    'cookie', 'notice', 'alert', 'toolbar', 'pagination', 'breadcrumb',
    'meta', 'info', 'author', 'date', 'category', 'tag'
  ];
  const className = (el.className || '').toLowerCase();
  const parent = el.closest ? el.closest('.nav, .menu, .header, .footer, .sidebar, .comment, .widget, .share, .ad') : null;
  return ignoreClasses.some(cls => className.includes(cls)) || parent !== null;
}

async function adaptFullPage(level, mode) {
  console.log('🔥 adaptFullPage вызвана!', { level, mode });
  
  // Показываем центрированный тост загрузки
  if (currentToast) currentToast.remove();
  const theme = await getTheme();
  const loadingToast = document.createElement('div');
  loadingToast.className = 'simpa-toast simpa-toast-centered';
  if (theme === 'light') loadingToast.classList.add('light');
  loadingToast.innerHTML = `
    <div class="simpa-toast-icon">🤖</div>
    <div class="simpa-toast-text">Адаптация страницы...<span class="simpa-dots"></span></div>
  `;
  document.body.appendChild(loadingToast);
  currentToast = loadingToast;
  loadingToast.style.position = 'fixed';
  loadingToast.style.top = '50%';
  loadingToast.style.left = '50%';
  loadingToast.style.transform = 'translate(-50%, -50%)';
  
  const allElements = Array.from(document.querySelectorAll('p'));
  
  const textElements = allElements.filter(el => {
    const text = el.innerText?.trim();
    if (!text) return false;
    if (text.length < 80) return false;
    if (text.length > 3000) return false;
    if (shouldIgnore(el)) return false;
    return true;
  });
  
  console.log(`📊 Найдено ${textElements.length} абзацев для адаптации`);
  
  originalTexts.clear();
  adaptedTexts.clear();
  adaptedElements = [];
  
  for (let i = 0; i < textElements.length; i++) {
    const el = textElements[i];
    const originalText = el.innerText.trim();
    if (!originalText) continue;
    
    originalTexts.set(el, originalText);
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'PROCESS_TEXT',
          text: originalText,
          mode: mode,
          level: level
        }, resolve);
      });
      
      if (response && response.result && !response.result.startsWith('❌')) {
        let result = response.result
          .replace(/^\s+/, '')
          .replace(/[\s\n]+$/, '')
          .replace(/\s+/g, ' ')
          .replace(/[a-zA-Z]/g, '');
        
        el.innerText = result;
        adaptedElements.push(el);
        adaptedTexts.set(el, result);
      }
    } catch (err) {
      console.error('Ошибка адаптации:', err);
    }
    
    if (i % 3 === 0) await new Promise(r => setTimeout(r, 200));
  }
  
  sessionStorage.setItem('simpa_adapted', 'true');
  isPageSimplified = true;
  console.log(`✅ Адаптировано ${adaptedElements.length} элементов`);
  
  // Убираем тост загрузки
  if (currentToast) currentToast.remove();
  currentToast = null;
  
  // Показываем центрированный тост с кнопкой переключения
  showCenteredToast(
    `Адаптировано ${adaptedElements.length} элементов страницы`,
    '🔄 Переключить версию',
    () => {
      togglePageVersion();
    }
  );
  
  return { success: true, adaptedCount: adaptedElements.length };
}

function togglePageVersion() {
  if (isPageSimplified) {
    // Возвращаем оригинал
    for (const [el, originalText] of originalTexts) {
      el.innerText = originalText;
    }
    isPageSimplified = false;
    console.log('🔄 Оригинальный текст восстановлен');
    showTemporaryNotification('Оригинальный текст восстановлен');
  } else {
    // Возвращаем адаптацию
    for (const [el, adaptedText] of adaptedTexts) {
      el.innerText = adaptedText;
    }
    isPageSimplified = true;
    console.log('✨ Адаптация возвращена');
    showTemporaryNotification('Адаптация снова включена');
  }
}

function restoreOriginalPage() {
  for (const [el, originalText] of originalTexts) {
    el.innerText = originalText;
  }
  originalTexts.clear();
  adaptedTexts.clear();
  adaptedElements = [];
  sessionStorage.removeItem('simpa_adapted');
  isPageSimplified = false;
  console.log('🔄 Оригинальный текст восстановлен');
}

// ===== ОБРАБОТЧИК СООБЩЕНИЙ =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 content.js получил сообщение:', request.type);
  
  if (request.type === 'SHOW_LOADING') {
    showLoadingToast(request.modeName);
    sendResponse({ success: true });
  } else if (request.type === 'SHOW_MODAL') {
    hideLoading();
    showToast(request.result, false);
    sendResponse({ success: true });
  } else if (request.type === 'HIDE_LOADING') {
    hideLoading();
    sendResponse({ success: true });
  } else if (request.type === 'ADAPT_PAGE') {
    console.log('🔥 Адаптация страницы запущена');
    adaptFullPage(request.level, request.mode)
      .then(result => {
        console.log('✅ Адаптация завершена:', result);
        sendResponse(result);
      })
      .catch(err => {
        console.error('❌ Ошибка адаптации:', err);
        sendResponse({ error: err.message });
      });
    return true;
  } else if (request.type === 'RESTORE_ORIGINAL') {
    togglePageVersion();
    sendResponse({ success: true });
  }
});

console.log('✅ content.js готов к приёму сообщений');