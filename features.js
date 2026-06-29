// --- ИНИЦИАЛИЗАЦИЯ НОВЫХ ФУНКЦИЙ ---
window.addEventListener('DOMContentLoaded', () => {
  injectGlobalStyles();
  setupFullscreenOverlay();
  fixSubmitButtonGlow();
  // Перезаписываем загрузку постов из app.js нашей новой умной логикой
  loadLocalNotes(); 
});

// --- 1. ДОБАВЛЕНИЕ СТИЛЕЙ БЕЗ ИЗМЕНЕНИЯ INDEX.HTML ---
function injectGlobalStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* Яркая неоновая подсветка для кнопки Отправить */
    .submit-glass-btn {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.6) !important;
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.3), 
                  0 0 15px rgba(255, 255, 255, 0.15), 
                  0 10px 40px rgba(0,0,0,0.6) !important;
      text-shadow: 0 0 8px rgba(255,255,255,0.6);
    }
    .submit-glass-btn:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.15) !important;
    }

    /* Стеклянная кнопка удаления на карточках */
    .delete-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.25);
      font-size: 18px;
      cursor: pointer;
      padding: 5px;
      line-height: 1;
      transition: color 0.2s, transform 0.2s;
      z-index: 5;
    }
    .delete-btn:hover {
      color: #ff453a;
      transform: scale(1.1);
    }

    /* Позиционирование для карточек, чтобы кнопка удаления не съезжала */
    .glass-card {
      position: relative;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    .glass-card:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    /* Стили для полноэкранного просмотра заметок */
    #fullscreen-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(35px) saturate(180%);
      -webkit-backdrop-filter: blur(35px) saturate(180%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 30px;
      box-sizing: border-box;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #fullscreen-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .overlay-close {
      position: absolute;
      top: calc(20px + env(safe-area-inset-top));
      right: 25px;
      font-size: 15px;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
    }
    .overlay-content {
      width: 100%;
      max-width: 500px;
      text-align: center;
      font-size: 20px;
      line-height: 1.6;
      font-weight: 400;
      letter-spacing: -0.3px;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);
}

// --- 2. СОЗДАНИЕ КРАСИВОГО МАКСИМАЛЬНОГО ОВЕРЛЕЯ ---
function setupFullscreenOverlay() {
  if (document.getElementById('fullscreen-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'fullscreen-overlay';
  overlay.innerHTML = `
    <div class="overlay-close" onclick="closeOverlay()">закрыть</div>
    <div class="overlay-content" id="overlay-text"></div>
  `;
  document.body.appendChild(overlay);
}

function openOverlay(text) {
  document.getElementById('overlay-text').innerHTML = text;
  document.getElementById('fullscreen-overlay').classList.add('active');
}

function closeOverlay() {
  document.getElementById('fullscreen-overlay').classList.remove('active');
}

// --- 3. ИСПРАВЛЕНИЕ ПОДСВЕТКИ КНОПКИ ОТПРАВИТЬ ---
function fixSubmitButtonGlow() {
  const btn = document.querySelector('.submit-glass-btn');
  if (btn) btn.classList.add('submit-glass-btn');
}

// --- 4. МОДЕРНИЗИРОВАННАЯ КАРТОЧКА С УДАЛЕНИЕМ И СОРТИРОВКОЙ ПО ЛЕНТАМ ---
function loadLocalNotes() {
  const myFeed = document.getElementById('myFeed');
  const recFeed = document.getElementById('recFeed');
  
  if (!myFeed || !recFeed) return;

  myFeed.innerHTML = '';
  // Очищаем рекомендации, оставляя только наш системный пост по умолчанию
  recFeed.innerHTML = `
    <div class="glass-card">
      <div class="card-text">Всё вокруг кажется симуляцией, пока ты не зальешь это в клуб. Первое децентрализованное PWA-приложение запущено.</div>
      <div class="card-meta">
        <span>системный поток</span>
        <span>публичное</span>
      </div>
    </div>
  `;

  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');

  if (notes.length === 0) {
    myFeed.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px 0; font-size: 14px;">Поток пуст...</div>';
    return;
  }

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    
    // Делаем так, чтобы при клике на саму карточку открывался полноэкранный режим (если это не клик по кнопке удаления или плееру)
    card.onclick = (e) => {
      if (!e.target.closest('.delete-btn') && !e.target.closest('.liquid-audio-player')) {
        let contentToView = note.text ? escapeHTML(note.text) : "Голосовая заметка";
        openOverlay(contentToView);
      }
    };
    
    let audioHtml = '';
    if (note.audio) {
      audioHtml = `
        <div class="liquid-audio-player">
          <button class="play-pause-btn" onclick="toggleAudio('audio-${note.id}')">
            <div class="play-icon"></div>
          </button>
          <div class="player-timeline" onclick="seekAudio(event, 'audio-${note.id}')">
            <div id="progress-audio-${note.id}" class="player-progress"></div>
          </div>
          <span id="time-audio-${note.id}" class="player-duration">0:00</span>
          <audio id="audio-${note.id}" src="${note.audio}" ontimeupdate="updateAudioProgress('audio-${note.id}')" onended="audioEnded('audio-${note.id}')"></audio>
        </div>
      `;
    }

    card.innerHTML = `
      <button class="delete-btn" onclick="deleteNote(event, ${note.id})">×</button>
      ${note.text ? `<div class="card-text">${escapeHTML(note.text)}</div>` : ''}
      ${audioHtml}
      <div class="card-meta">
        <span>${note.date}</span>
        <span>${note.scope === 'public' ? 'публичное' : 'личное'}</span>
      </div>
    `;

    // --- УМНОЕ РАСПРЕДЕЛЕНИЕ ПО ЛЕНТАМ ---
    // Если сообщение ПУБЛИЧНОЕ — оно мгновенно летит и в "Рекомендации" (публичный поток), и в "Писать" (твоя общая история)
    if (note.scope === 'public') {
      myFeed.appendChild(card.cloneNode(true));
      // Назначаем события для клонированной карточки в рекомендациях
      const recCard = myFeed.lastChild;
      setupCardEvents(recCard, note);
      
      recFeed.insertBefore(card, recFeed.firstChild);
    } else {
      // Если ЛИЧНОЕ — строго только во вкладку "Писать"
      myFeed.appendChild(card);
    }
  });
}

// Вспомогательная функция для восстановления кликов на клонированных карточках
function setupCardEvents(cardElement, note) {
  cardElement.onclick = (e) => {
    if (!e.target.closest('.delete-btn') && !e.target.closest('.liquid-audio-player')) {
      openOverlay(note.text ? escapeHTML(note.text) : "Голосовая заметка");
    }
  };
}

// --- 5. ФУНКЦИЯ ПОЛНОГО УДАЛЕНИЯ ЗАМЕТКИ ---
function deleteNote(event, id) {
  event.stopPropagation(); // Предотвращаем открытие оверлея при нажатии на крестик
  
  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  notes = notes.filter(note => note.id !== id);
  localStorage.setItem('obsidian_notes', JSON.stringify(notes));
  
  // Перезагружаем ленты
  loadLocalNotes();
}
