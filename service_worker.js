// ========== SimpaTEXT SERVICE WORKER (ИСПРАВЛЕННЫЙ) ==========
console.log('🚀 Service worker загружен');

function truncateText(text, maxLength = 2000) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getModePrompt(mode, text, level) {
  console.log('📝 Формируем промпт:', mode, level);
  
  const truncatedText = truncateText(text, 2000);
  
  const languageRule = 'ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ. МОЖНО ОСТАВЛЯТЬ АНГЛИЙСКИЕ АББРЕВИАТУРЫ. НЕ ИСПОЛЬЗУЙ КИТАЙСКИЕ ИЕРОГЛИФЫ. НЕ ИСПОЛЬЗУЙ МАРКДАУН.';
  
  if (mode === 'terms') {
    return `${languageRule}\n\nНайди сложные термины и объясни их простыми словами. Пиши кратко.\n\nТекст:\n${truncatedText}`;
  }
  
  if (mode === 'simple') {
    const levelRules = {
      light: `Слегка упрости текст. Замени сложные слова на простые. СОХРАНИ все важные детали, цифры, термины. НЕ УДАЛЯЙ факты. Сжатие 10-15%.`,
      
      medium: `Упрости текст. СОХРАНИ: ключевые цифры, термины ("баннерная слепота"), авторский стиль ("наверняка"), логику. Удали только повторы и воду. Сжатие 25-35%.`,
      
      hard: `СОКРАТИ текст сильно. Твой ответ ДОЛЖЕН БЫТЬ КОРОЧЕ исходного примерно на 50-60%.
      
СОХРАНИ ТОЛЬКО САМОЕ ГЛАВНОЕ:
- Основную мысль каждого абзаца (1 предложение)
- Ключевые термины ("баннерная слепота", "имиджевый контент")
- Вывод

НЕ ПИШИ ДЛИННЕЕ ОРИГИНАЛА!
Удали: примеры, повторы, воду, вводные конструкции.

Твой ответ должен быть КОРОТКИМ и по СУТИ.`
    };
    return `${languageRule}\n\n${levelRules[level]}\n\nТекст:\n${truncatedText}`;
  }
  
  if (mode === 'points') {
    const textLength = truncatedText.length;
    let instruction = '';
    if (textLength < 300) instruction = 'Текст короткий. Выдели 2-3 главных тезиса.';
    else if (textLength < 800) instruction = 'Выдели 3-5 главных мыслей.';
    else instruction = 'Выдели 4-6 ключевых тезисов.';
    
    return `${languageRule}\n\n${instruction} Каждый пункт с новой строки и с дефиса. Сохраняй цифры, даты, термины.\n\nТекст:\n${truncatedText}`;
  }
  
  return truncatedText;
}

function cleanResponse(response, mode, originalLength) {
  if (!response) return '';
  
  let cleaned = response;
  
  // Удаляем иероглифы
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '');
  
  // Удаляем маркдаун
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // Удаляем следы промпта
  const patterns = [
    /^ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ.*$/gm,
    /^Слегка упрости текст.*$/gm,
    /^Упрости текст.*$/gm,
    /^СОКРАТИ текст.*$/gm,
    /^Найди сложные термины.*$/gm,
    /^Выдели.*главных мыслей.*$/gm,
    /^Текст короткий.*$/gm,
    /^Твой ответ должен быть КОРОЧЕ.*$/gm,
    /^НЕ ПИШИ ДЛИННЕЕ ОРИГИНАЛА.*$/gm,
    /^Текст:\n.*$/gm
  ];
  
  patterns.forEach(p => { cleaned = cleaned.replace(p, ''); });
  
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  // Для максимального сжатия: если результат длиннее оригинала, обрезаем
  if (mode === 'simple' && originalLength && cleaned.length > originalLength * 0.6) {
    console.log(`⚠️ Результат слишком длинный (${cleaned.length} > ${originalLength * 0.6}), обрезаем`);
    const sentences = cleaned.split(/[.!?]\s+/);
    if (sentences.length > 3) {
      cleaned = sentences.slice(0, 3).join('. ') + '.';
    }
  }
  
  if (mode === 'points' && cleaned && !cleaned.startsWith('-')) {
    const lines = cleaned.split('\n');
    const fixed = lines.map(l => {
      if (l.trim() && !l.startsWith('-') && !l.startsWith('•')) {
        return '- ' + l.trim();
      }
      return l;
    });
    cleaned = fixed.join('\n');
  }
  
  return cleaned || '⚠️ Не удалось обработать текст';
}

async function callOllama(prompt, source = 'unknown') {
  console.log(`📡 (${source}) Вызов Ollama (qwen2.5:1.5b), длина:`, prompt.length);
  
  const body = JSON.stringify({
    model: 'qwen2.5:1.5b',
    prompt: prompt,
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 600,
      top_p: 0.9,
      repeat_penalty: 1.1
    }
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      signal: controller.signal,
      keepalive: true
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data && data.response && data.response.trim()) {
      return { success: true, result: data.response };
    }
    throw new Error('Пустой ответ');
  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`❌ Ошибка:`, e.message);
    if (e.name === 'AbortError') {
      return { success: false, error: 'Превышено время ожидания (60 сек)' };
    }
    if (e.message.includes('Failed to fetch')) {
      return { success: false, error: 'Ollama не запущен! Запустите: ollama serve' };
    }
    if (e.message.includes('HTTP 404')) {
      return { success: false, error: 'Модель не найдена. Установите: ollama pull qwen2.5:1.5b' };
    }
    return { success: false, error: e.message };
  }
}

function getErrorMessage(error) {
  return `❌ ${error}`;
}

// ========== MAIN HANDLER ==========
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log('📨 Получено:', req.type);
  
  if (req.type === 'PROCESS_TEXT') {
    const { text, mode, level } = req;
    const originalLength = text?.length || 0;
    
    if (!text || text.trim().length < 20) {
      sendResponse({ result: '⚠️ Текст слишком короткий' });
      return true;
    }
    
    const prompt = getModePrompt(mode, text, level);
    
    callOllama(prompt, sender?.url ? 'попап' : 'контекст').then(res => {
      if (res.success) {
        let cleaned = cleanResponse(res.result, mode, originalLength);
        if (!cleaned) cleaned = '⚠️ Не удалось обработать текст';
        sendResponse({ result: cleaned });
      } else {
        sendResponse({ result: getErrorMessage(res.error) });
      }
    }).catch(err => {
      sendResponse({ result: `❌ Ошибка: ${err.message}` });
    });
    
    return true;
  }
});

// ========== КОНТЕКСТНОЕ МЕНЮ ==========
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'simpaParent', title: '✨ SimpaTEXT', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'simpaSimple', parentId: 'simpaParent', title: '📖 Упростить', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'simpaTerms', parentId: 'simpaParent', title: '📚 Термины', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'simpaPoints', parentId: 'simpaParent', title: '📝 Тезисы', contexts: ['selection'] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText;
  if (!text) return;
  
  let mode = '';
  if (info.menuItemId === 'simpaSimple') mode = 'simple';
  if (info.menuItemId === 'simpaTerms') mode = 'terms';
  if (info.menuItemId === 'simpaPoints') mode = 'points';
  
  chrome.storage.local.get(['defaultLevel'], (res) => {
    processAndShow(tab.id, text, mode, res.defaultLevel || 'light');
  });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || ''
  }, (results) => {
    const text = results?.[0]?.result;
    if (!text) return;
    
    let mode = '';
    if (command === 'simplify-text') mode = 'simple';
    if (command === 'post-text') mode = 'terms';
    if (command === 'points-text') mode = 'points';
    
    chrome.storage.local.get(['defaultLevel'], (res) => {
      processAndShow(tab.id, text, mode, res.defaultLevel || 'light');
    });
  });
});

function getModeName(mode) {
  if (mode === 'simple') return 'Упрощение';
  if (mode === 'terms') return 'Термины';
  return 'Тезисы';
}

async function processAndShow(tabId, text, mode, level) {
  console.log('🔄 Обработка контекстного меню:', mode);
  
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_LOADING', modeName: getModeName(mode) });
  } catch (e) {}
  
  const prompt = getModePrompt(mode, text, level);
  const response = await callOllama(prompt, 'контекстное_меню');
  
  let resultText = response.success ? cleanResponse(response.result, mode, text.length) : `❌ ${response.error}`;
  
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULT', result: resultText });
  } catch (e) {}
}

console.log('✅ Service worker готов'); 