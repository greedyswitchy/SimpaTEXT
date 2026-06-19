// ===== SimpaTEXT CONTENT SCRIPT (ПОЛНАЯ ВЕРСИЯ) =====
let currentToast = null;
let currentOverlay = null;

console.log('🔴🔴🔴 content.js ЗАГРУЖЕН 🔴🔴🔴');

// ===== ВОССТАНОВЛЕНИЕ ПРИ ОБНОВЛЕНИИ =====
if (sessionStorage.getItem('simpa_adapted') === 'true') {
  sessionStorage.removeItem('simpa_adapted');
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['theme'], (result) => {
      resolve(result.theme || 'dark');
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function cleanResultText(text) {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
  return cleaned.trim();
}

function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

// ===== ФУНКЦИИ ДЛЯ ТОСТА =====
async function showToast(message, isError = false) {
  console.log('🎯 showToast вызван');
  
  if (currentToast) {
    if (currentToast.pulseInterval) clearInterval(currentToast.pulseInterval);
    currentToast.remove();
    currentToast = null;
  }
  
  const theme = await getTheme();
  
  const toast = document.createElement('div');
  toast.className = 'simpa-toast simpa-toast-fixed';
  if (theme === 'light') toast.classList.add('light');
  
  const formatted = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  
  toast.innerHTML = `
    <button class="simpa-toast-close">&times;</button>
    <div class="simpa-toast-icon">${isError ? '⚠️' : '✨'}</div>
    <div class="simpa-toast-content">
      <div class="simpa-toast-text simpa-toast-text--preserve">${formatted}</div>
      <button class="simpa-toast-copy">📋 Копировать</button>
    </div>
    <div class="simpa-toast-glow"></div>
  `;
  
  document.body.appendChild(toast);
  currentToast = toast;
  
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.right = '30px';
  toast.style.top = 'auto';
  toast.style.left = 'auto';
  toast.style.transform = 'none';
  toast.style.zIndex = '9999999';
  toast.style.opacity = '1';
  toast.style.width = '420px';
  toast.style.maxWidth = 'calc(100vw - 60px)';
  toast.style.backgroundColor = theme === 'light' ? '#f5f3ff' : '#1e1e2e';
  toast.style.borderRadius = '16px';
  toast.style.padding = '16px 20px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toast.style.border = theme === 'light' ? '1px solid #e0dee8' : '1px solid #2a2a3a';
  
  toast.querySelector('.simpa-toast-close').addEventListener('click', () => {
    toast.remove();
    currentToast = null;
  });
  
  toast.querySelector('.simpa-toast-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      const btn = toast.querySelector('.simpa-toast-copy');
      const orig = btn.textContent;
      btn.textContent = '✅ Скопировано!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    } catch (err) { console.error('Ошибка копирования'); }
  });
  
  setTimeout(() => {
    if (currentToast === toast) {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (currentToast === toast) toast.remove();
        if (currentToast === toast) currentToast = null;
      }, 200);
    }
  }, 15000);
}

async function showLoadingToast(modeName) {
  console.log('⏳ showLoadingToast вызван');
  
  if (currentToast) {
    if (currentToast.pulseInterval) clearInterval(currentToast.pulseInterval);
    currentToast.remove();
    currentToast = null;
  }
  
  const theme = await getTheme();
  
  const toast = document.createElement('div');
  toast.className = 'simpa-toast simpa-toast-fixed';
  if (theme === 'light') toast.classList.add('light');
  
  toast.innerHTML = `
    <div class="simpa-toast-icon">🤖</div>
    <div class="simpa-toast-content">
      <div class="simpa-toast-text">${escapeHtml(modeName)}<span class="simpa-dots"></span></div>
      <div style="font-size: 11px; color: #A0A0B0; margin-top: 8px;">⏳ Обработка... (10-30 секунд)</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  currentToast = toast;
  
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.right = '30px';
  toast.style.top = 'auto';
  toast.style.left = 'auto';
  toast.style.transform = 'none';
  toast.style.zIndex = '9999999';
  toast.style.opacity = '1';
  toast.style.width = '420px';
  toast.style.maxWidth = 'calc(100vw - 60px)';
  toast.style.backgroundColor = theme === 'light' ? '#f5f3ff' : '#1e1e2e';
  toast.style.borderRadius = '16px';
  toast.style.padding = '16px 20px';
  
  let pulse = setInterval(() => {
    if (currentToast !== toast) { clearInterval(pulse); return; }
    const icon = toast.querySelector('.simpa-toast-icon');
    if (icon) {
      icon.style.transform = 'scale(1.1)';
      setTimeout(() => { if (icon) icon.style.transform = 'scale(1)'; }, 300);
    }
  }, 1500);
  toast.pulseInterval = pulse;
}

async function showCenteredToast(message, buttonText = null, buttonAction = null) {
  if (currentToast) {
    if (currentToast.pulseInterval) clearInterval(currentToast.pulseInterval);
    currentToast.remove();
    currentToast = null;
  }
  
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
  
  toast.style.position = 'fixed';
  toast.style.top = '50%';
  toast.style.left = '50%';
  toast.style.transform = 'translate(-50%, -50%)';
  toast.style.zIndex = '9999999';
  toast.style.backgroundColor = theme === 'light' ? '#f5f3ff' : '#1e1e2e';
  toast.style.borderRadius = '16px';
  toast.style.padding = '16px 20px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  
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
  
  setTimeout(() => {
    if (currentToast === toast) toast.remove();
    if (currentToast === toast) currentToast = null;
  }, 5000);
}

function hideLoading() {
  if (currentToast) {
    if (currentToast.pulseInterval) clearInterval(currentToast.pulseInterval);
    currentToast.remove();
    currentToast = null;
  }
}

// ===== ФУНКЦИИ ДЛЯ ОВЕРЛЕЯ (АДАПТАЦИЯ СТРАНИЦЫ) =====
function showAdaptationOverlay(text) {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  
  getTheme().then(theme => {
    const overlay = document.createElement('div');
    overlay.className = 'simpa-overlay';
    if (theme === 'light') overlay.classList.add('light');
    
    overlay.innerHTML = `
      <div class="simpa-overlay-header">
        <span class="simpa-overlay-title">✨ SimpaTEXT — Адаптированная версия страницы</span>
        <div class="simpa-overlay-controls">
          <button class="simpa-overlay-minimize">─</button>
          <button class="simpa-overlay-close">✕</button>
        </div>
      </div>
      <div class="simpa-overlay-body">${escapeHtml(text)}</div>
      <div class="simpa-overlay-footer">
        <button class="btn-copy">📋 Копировать всё</button>
        <button class="btn-close">Закрыть</button>
      </div>
      <div class="simpa-overlay-resize"></div>
    `;
    
    document.body.appendChild(overlay);
    currentOverlay = overlay;
    
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    
    const header = overlay.querySelector('.simpa-overlay-header');
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.simpa-overlay-controls')) return;
      isDragging = true;
      dragOffsetX = e.clientX - overlay.offsetLeft;
      dragOffsetY = e.clientY - overlay.offsetTop;
      overlay.style.position = 'fixed';
      overlay.style.top = overlay.offsetTop + 'px';
      overlay.style.left = overlay.offsetLeft + 'px';
      overlay.style.transform = 'none';
      overlay.style.margin = '0';
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      overlay.style.left = (e.clientX - dragOffsetX) + 'px';
      overlay.style.top = (e.clientY - dragOffsetY) + 'px';
    });
    
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    const minimizeBtn = overlay.querySelector('.simpa-overlay-minimize');
    let isMinimized = false;
    let originalHeight, originalWidth;
    
    minimizeBtn.addEventListener('click', () => {
      const body = overlay.querySelector('.simpa-overlay-body');
      const footer = overlay.querySelector('.simpa-overlay-footer');
      const resize = overlay.querySelector('.simpa-overlay-resize');
      if (!isMinimized) {
        originalHeight = overlay.style.height;
        originalWidth = overlay.style.width;
        overlay.style.height = 'auto';
        body.style.display = 'none';
        footer.style.display = 'none';
        resize.style.display = 'none';
        minimizeBtn.textContent = '□';
        isMinimized = true;
      } else {
        if (originalHeight) overlay.style.height = originalHeight;
        if (originalWidth) overlay.style.width = originalWidth;
        body.style.display = 'block';
        footer.style.display = 'flex';
        resize.style.display = 'block';
        minimizeBtn.textContent = '─';
        isMinimized = false;
      }
    });
    
    const closeBtns = [overlay.querySelector('.simpa-overlay-close'), overlay.querySelector('.btn-close')];
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.remove();
        currentOverlay = null;
      });
    });
    
    overlay.querySelector('.btn-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        const btn = overlay.querySelector('.btn-copy');
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопировано!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      } catch (err) {
        console.error('Ошибка копирования:', err);
      }
    });
  });
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
  
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  
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
  
  const allElements = Array.from(document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, .text, article p, section p'));
  
  const textElements = allElements.filter(el => {
    const text = el.innerText?.trim();
    if (!text) return false;
    if (text.length < 80) return false;
    if (text.length > 3000) return false;
    if (shouldIgnore(el)) return false;
    return true;
  });
  
  console.log(`📊 Найдено ${textElements.length} абзацев для адаптации`);
  
  let allAdaptedText = '';
  let processedCount = 0;
  
  for (let i = 0; i < textElements.length; i++) {
    const el = textElements[i];
    const originalText = el.innerText.trim();
    if (!originalText) continue;
    
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
        let result = response.result;
        result = result.replace(/^\s+/, '');
        result = result.replace(/[\s\n]+$/, '');
        result = result.replace(/\s+/g, ' ');
        result = cleanResultText(result);
        
        if (result && result.length > 10) {
          allAdaptedText += result + '\n\n';
          processedCount++;
        }
      }
    } catch (err) {
      console.error('Ошибка адаптации абзаца:', err);
    }
    
    if (i % 3 === 0 && loadingToast) {
      loadingToast.querySelector('.simpa-toast-text').innerHTML = 
        `Адаптация страницы... (${i + 1}/${textElements.length})<span class="simpa-dots"></span>`;
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`✅ Обработано ${processedCount} абзацев, собрано ${allAdaptedText.length} символов`);
  
  if (currentToast) currentToast.remove();
  currentToast = null;
  
  if (allAdaptedText.trim() && allAdaptedText.length > 50) {
    showAdaptationOverlay(allAdaptedText);
    return { success: true, adaptedCount: processedCount };
  } else {
    showCenteredToast(
      'Не удалось адаптировать страницу. Возможные причины:\n• Текст слишком короткий\n• Проблемы с подключением к Ollama\n• Модель не отвечает\n\nПопробуйте другой уровень упрощения или обновите страницу.', 
      'Закрыть', 
      () => {}
    );
    return { success: false, error: 'Нет данных для адаптации' };
  }
}

async function showTemporaryNotification(message) {
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
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.zIndex = '9999999';
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
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
  } else if (request.type === 'SHOW_RESULT') {
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
    if (currentOverlay) {
      currentOverlay.remove();
      currentOverlay = null;
    }
    showTemporaryNotification('Оригинальный текст восстановлен');
    sendResponse({ success: true });
  }
  
  return true;
});

console.log('✅ content.js готов к приёму сообщений');