// --- ИНИЦИАЛИЗАЦИЯ МЕДИА-ФУНКЦИЙ ---
window.addEventListener('DOMContentLoaded', () => {
  injectMediaStyles();
  injectUploadButton();
  // Перезаписываем отправку и загрузку заметок нашей новой расширенной логикой
  window.sendPost = sendPostWithMedia;
  window.loadLocalNotes = loadNotesWithMediaAndAuthor;
  // Сразу перерисовываем ленту с учетом новых полей
  loadLocalNotes();
});

// --- 1. ДОБАВЛЕНИЕ СТИЛЕЙ ДЛЯ КНОПКИ ЗАГРУЗКИ ---
function injectMediaStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* Кнопка скрепки для загрузки файлов */
    .upload-glass-button {
      position: absolute;
      right: 70px; /* Ставим левее микрофона */
      bottom: 18px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--glass-border);
      border-top: 1px solid var(--glass-shine);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: all 0.2s ease;
      z-index: 20;
    }
    .upload-glass-button:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.1);
    }
    .upload-icon {
      width: 18px;
      height: 18px;
      fill: var(--text-main);
      opacity: 0.7;
    }
    /* Стиль автора над текстом заметки */
    .card-author {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 6px;
      opacity: 0.9;
      letter-spacing: -0.2px;
    }
  `;
  document.head.appendChild(style);
}

// --- 2. ВШИВАНИЕ КНОПКИ ЗАГРУЗКИ ТРЕКОВ В ИНТЕРФЕЙС ---
function injectUploadButton() {
  const inputPanel = document.querySelector('.input-glass-panel');
  if (!inputPanel || document.getElementById('uploadBtn')) return;

  // Создаем скрытый системный инпут для выбора файлов
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'hidden-audio-file';
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Создаем красивую стеклянную кнопку со скрепкой
  const uploadBtn = document.createElement('div');
  uploadBtn.id = 'uploadBtn';
  uploadBtn.className = 'upload-glass-button';
  uploadBtn.innerHTML = `
    <svg class="upload-icon" viewBox="0 0 24 24">
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-3.31 2.69-6 6-6s6 2.69 6 6v13c0 4.42-3.58 8-8 8s-8-3.58-8-8V6h2v12c0 3.31 2.69 6 6 6s6-2.69 6-6V5c0-2.21-1.79-4-4-4s-4 1.79-4 4v12.5c0 1.1.9 2 2 2s2-.9 2-2V6h2z"/>
    </svg>
  `;

  // Вешаем событие клика: нажали на скрепку -> открылся выбор файлов на устройстве
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Обрабатываем выбор файла
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      // Сохраняем загруженный трек в ту же переменную, куда пишется голос
      window.recordedAudioBase64 = reader.result;
      document.getElementById('noteText').placeholder = `🎵 Трек "${file.name.substring(0, 15)}..." готов к отправке`;
    };
  });

  // Вставляем кнопку внутрь стеклянной панели
  inputPanel.appendChild(uploadBtn);
}

// --- 3. ОБНОВЛЕННАЯ ОТПРАВКА ЗАМЕТКИ С ИМЕНЕМ АВТОРА ---
function sendPostWithMedia() {
  const textarea = document.getElementById('noteText');
  const text = textarea.value.trim();
  
  if (!text && !window.recordedAudioBase64) return;

  // Извлекаем имя пользователя, вошедшего через экран авторизации
  let currentAuthor = localStorage.getItem('notes_club_user') || 'Аноним';

  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  const newNote = {
    id: Date.now(),
    text: text,
    audio: window.recordedAudioBase64,
    scope: window.currentScope || 'private',
    author: currentAuthor, // Привязываем имя автора к структуре заметки
    date: new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  };

  notes.unshift(newNote);
  localStorage.setItem('obsidian_notes', JSON.stringify(notes));

  // Полностью очищаем поля ввода
  textarea.value = '';
  window.recordedAudioBase64 = null;
  document.getElementById('hidden-audio-file').value = '';
  textarea.placeholder = "Зафиксируй состояние или зажми микрофон...";
  
  loadLocalNotes();
}

// --- 4. ОТРЕНДЕРИТЬ ЛЕНТУ С УЧЕТОМ АВТОРОВ И ТРЕКОВ ---
function loadNotesWithMediaAndAuthor() {
  const myFeed = document.getElementById('myFeed');
  const recFeed = document.getElementById('recFeed');
  
  if (!myFeed || !recFeed) return;

  myFeed.innerHTML = '';
  recFeed.innerHTML = `
    <div class="glass-card">
      <div class="card-author">@system</div>
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
    
    card.onclick = (e) => {
      if (!e.target.closest('.delete-btn') && !e.target.closest('.liquid-audio-player')) {
        let contentToView = note.text ? escapeHTML(note.text) : "Медиазаметка";
        if (typeof openOverlay === 'function') openOverlay(contentToView);
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

    // Собираем карточку, где сверху гордо выводится имя её создателя через знак @
    card.innerHTML = `
      <button class="delete-btn" onclick="deleteNote(event, ${note.id})">×</button>
      <div class="card-author">@${escapeHTML(note.author || "Аноним")}</div>
      ${note.text ? `<div class="card-text">${escapeHTML(note.text)}</div>` : ''}
      ${audioHtml}
      <div class="card-meta">
        <span>${note.date}</span>
        <span>${note.scope === 'public' ? 'публичное' : 'личное'}</span>
      </div>
    `;

    // Распределяем по двум вкладкам
    if (note.scope === 'public') {
      myFeed.appendChild(card.cloneNode(true));
      const recCard = myFeed.lastChild;
      if (typeof setupCardEvents === 'function') setupCardEvents(recCard, note);
      
      recFeed.insertBefore(card, recFeed.firstChild);
    } else {
      myFeed.appendChild(card);
    }
  });
}
