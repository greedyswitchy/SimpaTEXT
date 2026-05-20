chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'PROCESS_TEXT') {

    function buildSimplePrompt(text, level = 'light') {
      const baseRules = `
Ты — строгий редактор для упрощения текста. Перепиши текст простыми словами ТОЛЬКО на русском языке.

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ (НЕ НАРУШАТЬ!):
- НЕЛЬЗЯ писать "like", "liked", "nice", "ok", "cool", "bye", "wow", "yes", "no", "hello", "hi"
- НЕЛЬЗЯ писать "was", "were", "have", "has", "do", "does", "did", "is", "are", "am"
- НЕЛЬЗЯ писать "and", "or", "but", "so", "because", "if", "when", "then"
- НЕЛЬЗЯ писать "I", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"
- НЕЛЬЗЯ использовать латиницу. Только русские буквы!

## ПРАВИЛА:
1. НЕ добавляй новую информацию
2. НЕ делай выводов
3. НЕ придумывай примеры
4. НЕ меняй факты
5. Сохрани все ключевые смыслы
6. Пиши ТОЛЬКО на русском
7. Ответ должен быть ТОЛЬКО упрощённым текстом, БЕЗ пояснений

## ПРИМЕР:
Исходный текст: "Чехов was не liked пестрые наряды"
Правильный ответ: "Чехов не любил пестрые наряды"
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
      prompt = `Напиши пост для Telegram-канала в стиле "Бэкдор" или "Тренды" ТОЛЬКО на русском языке.

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ:
- НЕЛЬЗЯ писать "like", "liked", "nice", "ok", "cool", "bye", "wow", "yes", "no", "hello", "hi"
- НЕЛЬЗЯ писать "was", "were", "have", "has", "do", "does", "did", "is", "are", "am"
- НЕЛЬЗЯ писать "and", "or", "but", "so", "because", "if", "when", "then"
- НЕЛЬЗЯ использовать латиницу. Только русские буквы!

## Стиль:
- Первая строка — заголовок (короткий, цепляющий, можно с капсом или восклицанием)
- После заголовка пустая строка
- 3-4 коротких абзаца (1-3 предложения)
- 1-2 эмодзи (🔥, 😱, 🎉, 👀)
- В конце — вывод или хештег

## Правила:
- Только факты из текста
- Без английских слов
- Без официальщины

Исходный текст:
${req.text}`;

    } else if (req.mode === 'simple') {
      prompt = buildSimplePrompt(req.text, req.level);

    } else if (req.mode === 'points') {
      prompt = `Ты — строгий составитель тезисов. Выдели из текста 3-5 главных мыслей ТОЛЬКО на русском языке.

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ:
- НЕЛЬЗЯ писать "like", "liked", "nice", "ok", "cool", "bye", "wow", "yes", "no"
- НЕЛЬЗЯ писать "was", "were", "have", "has", "do", "does", "did", "is", "are", "am"
- НЕЛЬЗЯ использовать латиницу. Только русские буквы!

## СТРОГИЕ ПРАВИЛА:
1. НЕ выдумывай то, чего нет в тексте
2. НЕ меняй смысл исходного текста
3. НЕ добавляй выводы от себя
4. Каждый тезис начинается с "- "
5. Каждый тезис — одно короткое предложение
6. Используй только факты из текста

## ПРИМЕР:
Исходный текст: "Чехов не любил фальшь. Он считал, что люди должны быть проще."
Правильные тезисы:
- Чехов не любил фальшь
- Он считал, что люди должны быть проще

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

      // ===== ЖЁСТКАЯ ПОСТОБРАБОТКА: УДАЛЯЕМ АНГЛИЙСКИЕ СЛОВА =====
      const englishWords = /\b(like|liked|nice|ok|cool|bye|wow|yes|no|hello|hi|was|were|have|has|do|does|did|is|are|am|and|or|but|so|because|if|when|then|I|you|he|she|it|we|they|me|him|her|us|them|the|a|an|to|for|of|with|on|at|by|from|up|down|in|out|off|over|under|again|further|then|once|here|there|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|that|then|these|those|through|until|unto|upon|with|without|after|before|above|below|between|during|without|through|throughout|from|against|could|would|should|may|might|must|what|which|who|whom|this|that|these|those|be|been|being|had|having|do|doing|does|did|doing)\b/gi;
      
      result = result.replace(englishWords, '');
      result = result.replace(/[a-zA-Z]/g, '');
      result = result.replace(/\s+/g, ' ');
      result = result.replace(/^[\s,.;:]+/, '');
      result = result.trim();

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

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ:
- НЕЛЬЗЯ использовать латиницу. Только русские буквы!
- НЕЛЬЗЯ писать like, liked, nice, ok, cool, bye, wow, yes, no
- НЕЛЬЗЯ писать was, were, have, has, do, does, did, is, are, am

## ПРАВИЛА:
1. НЕ добавляй новую информацию
2. НЕ делай выводов
3. НЕ меняй факты
4. Пиши ТОЛЬКО на русском
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
    prompt = `Напиши пост для Telegram-канала на русском языке.

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ:
- НЕЛЬЗЯ использовать латиницу. Только русские буквы!
- НЕЛЬЗЯ писать like, liked, nice, ok, cool, bye, wow, yes, no

## Стиль:
- Короткий заголовок
- Разговорный русский
- Короткие абзацы
- 1-2 эмодзи

Исходный текст:
${text}`;
  } else if (mode === 'simple') {
    prompt = buildSimplePromptForPage(text, level);
  } else if (mode === 'points') {
    prompt = `Ты — составитель тезисов. Выдели из текста 3-5 главных мыслей ТОЛЬКО на русском языке.

## ЖЁСТКИЙ ЗАПРЕТ НА АНГЛИЙСКИЙ:
- НЕЛЬЗЯ использовать латиницу
- НЕЛЬЗЯ писать like, liked, nice, ok, cool

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
    
    const englishWords = /\b(like|liked|nice|ok|cool|bye|wow|yes|no|hello|hi|was|were|have|has|do|does|did|is|are|am|and|or|but|so|because|if|when|then|I|you|he|she|it|we|they)\b/gi;
    result = result.replace(englishWords, '');
    result = result.replace(/[a-zA-Z]/g, '');
    result = result.replace(/\s+/g, ' ').trim();
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