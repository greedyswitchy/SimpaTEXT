chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'PROCESS_TEXT') {

    function buildSimplePrompt(text, level = 'light') {
      const baseRules = `
Ты — строгий редактор для упрощения текста. Перепиши текст простыми словами ТОЛЬКО на русском языке.

## ПРАВИЛА ПО РУССКОМУ ЯЗЫКУ:
- Используй русские слова, но НЕ ВЫРЕЗАЙ технические термины и названия (.NET, Framework, CLS, API, JSON, XML, GitHub, Visual Studio, Windows, Linux, macOS, C#, Java, Python и т.п.)
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические названия (.NET, CLS и т.п.) ОСТАВЛЯЙ как есть

## ТРЕБОВАНИЯ К ФОРМАТИРОВАНИЮ:
- Сохраняй исходные переносы строк
- Сохраняй пустые строки между абзацами (делай \n\n)
- Не склеивай строки в один абзац

## ПРАВИЛА:
1. НЕ добавляй новую информацию
2. НЕ делай выводов
3. НЕ придумывай примеры
4. НЕ меняй факты
5. Сохрани все ключевые смыслы
6. Пиши ТОЛЬКО на русском (кроме технических названий)

## ПРИМЕР:
Исходный текст: ".NET Framework — платформа для создания приложений"
Правильный ответ: ".NET Framework — платформа для создания приложений"
`;

      if (level === 'light') {
        return `${baseRules}

## РЕЖИМ: ЛЕГКОЕ УПРОЩЕНИЕ (20-30%)

Разрешено:
- Заменять длинные словосочетания на короткие по смыслу
- Использовать синонимы
- Перестраивать предложения для простоты

Исходный текст:
${text}`;
      }

      if (level === 'medium') {
        return `${baseRules}

## РЕЖИМ: СРЕДНЕЕ УПРОЩЕНИЕ (35-55%)

Разрешено:
- Только удалять слова и конструкции
- Запрещено перефразировать и перестраивать

Исходный текст:
${text}`;
      }

      if (level === 'hard') {
        return `${baseRules}

## РЕЖИМ: МАКСИМАЛЬНОЕ УПРОЩЕНИЕ (55-75%)

Можно только:
- Удалять всё, что не несёт смысловой нагрузки
- Нельзя менять слова и порядок слов

Исходный текст:
${text}`;
      }
    }

    let prompt = '';

    if (req.mode === 'post') {
      prompt = `Ты — автор Telegram-канала. Напиши КОРОТКИЙ пост на русском языке, который СУММИРУЕТ главную мысль текста.

## ПРАВИЛА:
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические термины (.NET, Framework, CLS, API и т.п.) МОЖНО
- ТОЛЬКО русский язык

## ЖЁСТКИЕ ПРАВИЛА:
1. Не переписывай текст целиком — выдели САМОЕ ГЛАВНОЕ
2. Сделай пост в 3-4 раза КОРОЧЕ оригинала
3. Первая строка — заголовок (короткий, цепляющий)
4. После заголовка пустая строка
5. 2-3 коротких абзаца (1-2 предложения каждый)
6. Добавь 1 эмодзи (🔥, ⚡, 💡, 🚀)

## ТРЕБОВАНИЯ К ФОРМАТИРОВАНИЮ:
- Сохраняй пустые строки между абзацами (делай \n\n)
- Каждый абзац начинай с новой строки
- Не склеивай строки в один сплошной текст

Исходный текст:
${req.text}`;

    } else if (req.mode === 'simple') {
      prompt = buildSimplePrompt(req.text, req.level);

    } else if (req.mode === 'points') {
      prompt = `Ты — строгий составитель тезисов. Выдели из текста 3-5 главных мыслей ТОЛЬКО на русском языке.

## ПРАВИЛА:
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические термины (.NET, Framework, CLS, API и т.п.) МОЖНО
- ТОЛЬКО русский язык

## СТРОГИЕ ПРАВИЛА:
1. НЕ выдумывай то, чего нет в тексте
2. НЕ меняй смысл исходного текста
3. НЕ добавляй выводы от себя
4. Каждый тезис начинается с "- "
5. Каждый тезис — одно короткое предложение
6. Используй только факты из текста

## ПРИМЕР:
Исходный текст: ".NET Framework — платформа для создания приложений. Она содержит классы и интерфейсы."
Правильные тезисы:
- .NET Framework — платформа для создания приложений
- Она содержит классы и интерфейсы

Исходный текст:
${req.text}`;
    }

    fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 600
        }
      })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      let result = data.response || 'Нет ответа';

      // ===== ПОСТОБРАБОТКА: УДАЛЯЕМ ТОЛЬКО ИЕРОГЛИФЫ (НЕ ТРОГАЕМ АНГЛИЙСКИЕ СЛОВА И БУКВЫ) =====
      
      // Удаляем китайские, японские, корейские иероглифы (диапазоны Unicode)
      result = result.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '');
      
      // Чистим лишние пробелы, НО НЕ ТРОГАЕМ ПЕРЕНОСЫ СТРОК
      result = result.replace(/[ \t]+/g, ' ');
      result = result.replace(/[ \t]+\n/g, '\n');
      result = result.replace(/\n{3,}/g, '\n\n');
      result = result.replace(/^[\s,.;:]+/, '');
      result = result.trim();

      // Удаляем пояснения модели
      result = result.replace(/^(Выполняю|Твой ответ|Вот упрощённый|Сокращение|Режим|Текст:|Исходный текст|Пример|Правильный ответ)[^\n]*\n?/gi, '');
      result = result.trim();

      if (req.mode === 'points') {
        result = result.replace(/^[^\-]*?(?=\-)/, '');
        result = result.replace(/[^\n\-][^\-]*?\n/g, (match) => {
          if (!match.startsWith('- ')) return '';
          return match;
        });
      }

      if (result === '') {
        result = 'Не удалось обработать текст. Попробуйте ещё раз.';
      }

      sendResponse({ result: result });
    })
    .catch(err => {
      let userMessage = `❌ Ошибка: ${err.message}`;
      sendResponse({ result: userMessage });
    });

    return true;
  }
});

// ========== КОНТЕКСТНОЕ МЕНЮ И ГОРЯЧИЕ КЛАВИШИ ==========

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'simpaParent',
      title: '✨ SimpaTEXT',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'simpaSimple',
      parentId: 'simpaParent',
      title: '📖 Упростить текст',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'simpaPost',
      parentId: 'simpaParent',
      title: '📱 Пост для соцсетей',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'simpaPoints',
      parentId: 'simpaParent',
      title: '📝 Тезисы',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  if (!selectedText) return;
  let mode = '';
  if (info.menuItemId === 'simpaSimple') mode = 'simple';
  if (info.menuItemId === 'simpaPost') mode = 'post';
  if (info.menuItemId === 'simpaPoints') mode = 'points';
  chrome.storage.local.get(['defaultLevel'], (result) => {
    const level = result.defaultLevel || 'light';
    processAndShowOnPage(tab.id, selectedText, mode, level);
  });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  }, (results) => {
    const selectedText = results?.[0]?.result;
    if (!selectedText) return;
    let mode = '';
    if (command === 'simplify-text') mode = 'simple';
    if (command === 'post-text') mode = 'post';
    if (command === 'points-text') mode = 'points';
    chrome.storage.local.get(['defaultLevel'], (result) => {
      const level = result.defaultLevel || 'light';
      processAndShowOnPage(tab.id, selectedText, mode, level);
    });
  });
});

function getModeName(mode) {
  if (mode === 'simple') return 'Упрощение текста';
  if (mode === 'post') return 'Пост для соцсетей';
  if (mode === 'points') return 'Тезисы';
  return 'Обработка';
}

function buildSimplePromptForPage(text, level = 'light') {
  const baseRules = `
Ты — строгий редактор для упрощения текста. Перепиши текст простыми словами ТОЛЬКО на русском языке.

## ПРАВИЛА:
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические термины (.NET, Framework, CLS, API и т.п.) МОЖНО
- ТОЛЬКО русский язык

## ТРЕБОВАНИЯ К ФОРМАТИРОВАНИЮ:
- Сохраняй исходные переносы строк
- Сохраняй пустые строки между абзацами (делай \n\n)
- Не склеивай строки в один абзац

## ПРАВИЛА:
1. НЕ добавляй новую информацию
2. НЕ делай выводов
3. НЕ меняй факты
4. Пиши ТОЛЬКО на русском (кроме технических названий)
`;

  if (level === 'light') {
    return `${baseRules}

## РЕЖИМ: ЛЕГКОЕ УПРОЩЕНИЕ

Исходный текст:
${text}`;
  }
  if (level === 'medium') {
    return `${baseRules}

## РЕЖИМ: СРЕДНЕЕ УПРОЩЕНИЕ

Исходный текст:
${text}`;
  }
  if (level === 'hard') {
    return `${baseRules}

## РЕЖИМ: МАКСИМАЛЬНОЕ УПРОЩЕНИЕ

Исходный текст:
${text}`;
  }
}

function processAndShowOnPage(tabId, text, mode, level) {
  chrome.tabs.sendMessage(tabId, {
    type: 'SHOW_LOADING',
    modeName: getModeName(mode)
  }).catch(() => {});

  let prompt = '';

  if (mode === 'post') {
    prompt = `Ты — автор Telegram-канала. Напиши КОРОТКИЙ пост на русском языке, который СУММИРУЕТ главную мысль текста.

## ПРАВИЛА:
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические термины (.NET, Framework, CLS, API и т.п.) МОЖНО
- ТОЛЬКО русский язык

## ЖЁСТКИЕ ПРАВИЛА:
1. Не переписывай текст целиком — выдели САМОЕ ГЛАВНОЕ
2. Сделай пост в 3-4 раза КОРОЧЕ оригинала
3. Первая строка — заголовок (короткий, цепляющий)
4. После заголовка пустая строка
5. 2-3 коротких абзаца (1-2 предложения каждый)
6. Добавь 1 эмодзи (🔥, ⚡, 💡, 🚀)

## ТРЕБОВАНИЯ К ФОРМАТИРОВАНИЮ:
- Сохраняй пустые строки между абзацами (делай \n\n)
- Каждый абзац начинай с новой строки
- Не склеивай строки в один сплошной текст

Исходный текст:
${text}`;
  } else if (mode === 'simple') {
    prompt = buildSimplePromptForPage(text, level);
  } else if (mode === 'points') {
    prompt = `Ты — составитель тезисов. Выдели из текста 3-5 главных мыслей ТОЛЬКО на русском языке.

## ПРАВИЛА:
- ЗАПРЕЩЕНЫ любые иероглифы (китайские, японские, корейские)
- Технические термины (.NET, Framework, CLS, API и т.п.) МОЖНО
- ТОЛЬКО русский язык

## Правила:
- Каждый тезис начинается с "- "
- Только факты из текста

Исходный текст:
${text}`;
  }

  fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 500
      }
    })
  })
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    let result = data.response || 'Нет ответа';
    
    // ===== ПОСТОБРАБОТКА: УДАЛЯЕМ ТОЛЬКО ИЕРОГЛИФЫ =====
    
    // Удаляем китайские, японские, корейские иероглифы
    result = result.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '');
    
    // Чистим лишние пробелы, НО НЕ ТРОГАЕМ ПЕРЕНОСЫ
    result = result.replace(/[ \t]+/g, ' ');
    result = result.replace(/[ \t]+\n/g, '\n');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.trim();
    
    result = result.replace(/^(Выполняю|Твой ответ|Вот упрощённый|Сокращение|Режим|Текст:|Исходный текст)[^\n]*\n?/gi, '');
    result = result.trim();
    
    if (mode === 'points') {
      result = result.replace(/^[^\-]*?(?=\-)/, '');
    }
    if (result === '') {
      result = 'Не удалось обработать текст. Попробуйте ещё раз.';
    }
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_MODAL',
      result: result,
      modeName: getModeName(mode)
    }).catch(() => {});
  })
  .catch(err => {
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_MODAL',
      result: `❌ Ошибка: ${err.message}`,
      modeName: getModeName(mode)
    }).catch(() => {});
  });
}