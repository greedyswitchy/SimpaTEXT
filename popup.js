document.addEventListener('DOMContentLoaded', () => {

  const buttons = document.querySelectorAll('.mode-btn');
  const indicator = document.getElementById('modeIndicator');
  const input = document.getElementById('inputText');
  const output = document.getElementById('outputText');
  const actionBtn = document.getElementById('simplifyBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconDark = document.querySelector('.theme-icon-dark');
  const themeIconLight = document.querySelector('.theme-icon-light');

  let currentMode = 'post';
  let currentLevel = 'light';

  const modeNames = {
    post: 'ИИ-режим поста',
    simple: 'Упрощение текста',
    points: 'Тезисы'
  };

  function updateIndicator() {
    const levelNames = {
      light: 'легкая',
      medium: 'средняя',
      hard: 'максимальная'
    };

    if (currentMode === 'simple') {
      indicator.textContent = `Текущий режим: ${modeNames[currentMode]} (${levelNames[currentLevel]})`;
    } else {
      indicator.textContent = `Текущий режим: ${modeNames[currentMode]}`;
    }
    indicator.classList.add('flash');
    setTimeout(() => indicator.classList.remove('flash'), 300);
  }

  // ===== Восстановление состояния =====
chrome.storage.session.get(['inputText', 'outputText', 'mode'], (result) => {
  if (result.inputText) input.value = result.inputText;
  if (result.outputText && result.outputText !== 'Обработка...') output.textContent = result.outputText;
  if (result.mode) {
    currentMode = result.mode;
    const levelBlock = document.getElementById('simplifyLevelsWrap');
    if (currentMode === 'simple') {
      levelBlock.classList.remove('hidden');
    } else {
      levelBlock.classList.add('hidden');
    }
    buttons.forEach(btn => {
      btn.classList.toggle('mode-btn--active', btn.dataset.mode === currentMode);
    });
  } else {
    // При первом запуске — скрываем уровни (режим 'post')
    const levelBlock = document.getElementById('simplifyLevelsWrap');
    levelBlock.classList.add('hidden');
  }
  updateIndicator();
});

  // ===== Сохранение текста =====
  let saveTimeout;
  input.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      chrome.storage.session.set({ inputText: input.value });
    }, 300);
  });

  const saveOutput = (text) => {
    chrome.storage.session.set({ outputText: text });
  };

  // ===== Тема =====
  chrome.storage.local.get(['theme'], (result) => {
    const savedTheme = result.theme || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light');
      themeIconDark.style.display = 'none';
      themeIconLight.style.display = 'block';
    }
  });

  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
    themeIconDark.style.display = isLight ? 'none' : 'block';
    themeIconLight.style.display = isLight ? 'block' : 'none';
  });

  // ===== Режимы =====
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;
      if (newMode === currentMode) return;
      if (input.value.trim()) {
        if (!confirm('Текст очистится при смене режима. Продолжить?')) return;
        input.value = '';
        output.textContent = '';
        chrome.storage.session.set({ inputText: '', outputText: '' });
      }
      buttons.forEach(b => b.classList.remove('mode-btn--active'));
      btn.classList.add('mode-btn--active');
      currentMode = newMode;
      const levelBlock = document.getElementById('simplifyLevelsWrap');
      levelBlock.classList.toggle('hidden', currentMode !== 'simple');
      chrome.storage.session.set({ mode: currentMode });
      updateIndicator();
    });
  });

  // ===== Уровни =====
  const levelButtons = document.querySelectorAll('.level-btn');
  levelButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      levelButtons.forEach(b => b.classList.remove('level-btn--active'));
      btn.classList.add('level-btn--active');
      currentLevel = btn.dataset.level;
      updateIndicator();
    });
  });

  // ===== Обработка выделенного текста =====
  actionBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      output.textContent = 'Введите текст.';
      saveOutput('Введите текст.');
      return;
    }
    output.textContent = 'Обработка...';
    saveOutput('Обработка...');
    chrome.runtime.sendMessage(
      { type: 'PROCESS_TEXT', text, mode: currentMode, level: currentLevel },
      (response) => {
        output.textContent = response.result;
        saveOutput(response.result);
      }
    );
  });

  // ===== АДАПТАЦИЯ ВСЕЙ СТРАНИЦЫ (НЕЗАВИСИМАЯ) =====
  const adaptPageBtn = document.getElementById('adaptPageBtn');
  const restoreOriginalBtn = document.getElementById('restoreOriginalBtn');
  const pageLevelPanel = document.getElementById('pageLevelPanel');
  let currentPageLevel = 'light';

  adaptPageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pageLevelPanel.classList.toggle('hidden');
  });

  document.querySelectorAll('#pageLevelPanel .level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pageLevelPanel .level-btn').forEach(b => 
        b.classList.remove('level-btn--active'));
      btn.classList.add('level-btn--active');
      currentPageLevel = btn.dataset.level;
      pageLevelPanel.classList.add('hidden');
      adaptFullPage(currentPageLevel, 'simple');
    });
  });

  function adaptFullPage(level, mode) {
    output.textContent = '🌐 Адаптация страницы... (может занять 30-60 секунд)';
    adaptPageBtn.classList.add('split-btn--active');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'ADAPT_PAGE',
        level: level,
        mode: mode
      }, (response) => {
        if (response && response.success) {
          output.textContent = `✅ Адаптировано ${response.adaptedCount} элементов страницы!`;
          restoreOriginalBtn.classList.remove('hidden');
        } else if (response && response.error) {
          output.textContent = `❌ Ошибка: ${response.error}`;
          adaptPageBtn.classList.remove('split-btn--active');
        } else {
          output.textContent = '❌ Не удалось адаптировать страницу. Убедитесь, что расширение имеет доступ к этой странице.';
          adaptPageBtn.classList.remove('split-btn--active');
        }
      });
    });
  }

  restoreOriginalBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'RESTORE_ORIGINAL' }, () => {
        output.textContent = '🔄 Оригинальный текст восстановлен';
        restoreOriginalBtn.classList.add('hidden');
        adaptPageBtn.classList.remove('split-btn--active');
      });
    });
  });

  // ===== Перед закрытием =====
  window.addEventListener('beforeunload', () => {
    chrome.storage.session.set({
      inputText: input.value,
      mode: currentMode,
      outputText: output.textContent
    });
  });

  // ===== КНОПКА КОПИРОВАНИЯ В ПОПАПЕ =====
  const copyBtn = document.getElementById('copyResultBtn');
  const outputPre = document.getElementById('outputText');
  let copyTimeout = null;

  function showCopyButton() {
    if (!copyBtn) return;
    copyBtn.classList.add('visible');
  }

  function hideCopyButton() {
    if (!copyBtn) return;
    copyBtn.classList.remove('visible');
  }

  function resetCopyButtonTimer() {
    if (copyTimeout) clearTimeout(copyTimeout);
    hideCopyButton();
    
    const text = outputPre.textContent;
    if (text && text !== 'Обработка...' && text !== 'Введите текст.' && !text.startsWith('❌')) {
      copyTimeout = setTimeout(() => {
        showCopyButton();
      }, 3000);
    }
  }

  if (outputPre) {
    const resultObserver = new MutationObserver(() => {
      resetCopyButtonTimer();
    });
    resultObserver.observe(outputPre, { childList: true, subtree: true, characterData: true });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = outputPre.textContent;
      if (!text || text === 'Обработка...' || text === 'Введите текст.' || text.startsWith('❌')) return;
      
      try {
        await navigator.clipboard.writeText(text);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Скопировано!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      } catch (err) {
        copyBtn.textContent = '❌ Ошибка';
        setTimeout(() => {
          copyBtn.textContent = '📋 Копировать';
        }, 1500);
      }
    });
  }

});