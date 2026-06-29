// --- МОНОЛИТНАЯ ОНЛАЙН СИНХРОНИЗАЦИЯ ЧЕРЕЗ НЕЗАВИСИМЫЙ СЕРВЕР NODE.JS ---
const SERVER_URL = "https://notes-club-server.onrender.com";

window.addEventListener('DOMContentLoaded', () => {
  injectMediaStyles();
  injectUploadButton();
  
  // Перезаписываем функции в глобальном окне
  window.sendPost = sendPostToNodeServer;
  window.loadLocalNotes = loadOnlyLocalNotes;
  window.deleteNote = deleteNoteFromLocal;

  // Намертво привязываем клик кнопки «Отправить» к нашему новому серверу
  setTimeout(() => {
    const submitBtn = document.querySelector('.submit-glass-btn');
    if (submitBtn) {
      submitBtn.removeAttribute('onclick');
      const newBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newBtn, submitBtn);
      newBtn.addEventListener('click', sendPostToNodeServer);
    }
    
    // Запускаем живой стрим с сервера
    listenToNodeRecommendations();
    // Отрисовываем личные заметки
    loadOnlyLocalNotes();
  }, 200);
});

// --- 1. ИСПРАВЛЕННАЯ ОТПРАВКА НА СЕРВЕР С ОБХОДОМ БЛОКИРОВКИ БРАУЗЕРА ---
async function sendPostToNodeServer() {
  const textarea = document.getElementById('noteText');
  const text = textarea.value.trim();
  
  if (!text && !window.recordedAudioBase64) return;

  let currentAuthor = localStorage.getItem('notes_club_user') || localStorage.getItem('obsidian_username') || window.currentUsername || 'Пользователь';
  const postDate = new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  const scope = window.currentScope || 'private';

  const newNote = {
    id: Date.now(),
    text: text,
    audio: window.recordedAudioBase64 || null,
    scope: scope,
    author: currentAuthor,
    date: postDate
  };

  // Если ПУБЛИЧНОЕ — отправляем на наш новый быстрый Render сервер
  if (scope === 'public') {
    try {
      // Добавили специальные заголовкиcors, чтобы браузер не блокировал кнопку
      const response = await fetch(`${SERVER_URL}/api/posts`, {
        method: "POST",
        mode: "cors",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(newNote)
      });
      if (response.ok) {
        console.log("📡 Публичный пост успешно улетел на независимый сервер Render!");
      }
    } catch (err) {
      console.error("Ошибка сети с сервером Render:", err);
    }
  }

  // Дублируем в локальную историю "Заметки" автора
  let localNotes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  localNotes.unshift(newNote);
  localStorage.setItem('obsidian_notes', JSON.stringify(localNotes));

  // Полная очистка полей ввода
  textarea.value = '';
  window.recordedAudioBase64 = null;
  const hf = document.getElementById('hidden-audio-file');
  if (hf) hf.value = '';
  textarea.placeholder = "Зафиксируй состояние или зажми микрофон...";
  
  loadOnlyLocalNotes();
}

// --- 2. ПОСТОЯННОЕ ОБНОВЛЕНИЕ РЕКОМЕНДАЦИЙ (ЖИВОЙ СТРИМ) ---
function listenToNodeRecommendations() {
  const recFeed = document.getElementById('recFeed');
  if (!recFeed) return;

  async function fetchPosts() {
    if (recFeed.classList.contains('hidden')) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/posts`, {
        method: "GET",
        mode: "cors",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      const onlinePosts = await response.json();

      recFeed.innerHTML = ''; 

      onlinePosts.forEach(note => {
        const cardRec = document.createElement('div');
        cardRec.className = 'glass-card';
        cardRec.innerHTML = buildCardHTML(note, true);
        
        cardRec.onclick = (e) => {
          if (!e.target.closest('.liquid-audio-player')) {
            try {
              if (typeof window.openOverlay === 'function') {
                window.openOverlay(note.text ? escapeHTML(note.text) : "Медиазаметка");
              }
            } catch(err) { console.log(err); }
          }
        };

        recFeed.appendChild(cardRec);
      });

      if (typeof window.applyTimeDissolveEffect === 'function') {
        window.applyTimeDissolveEffect();
      }

    } catch (err) {
      console.log("Ожидание ответа от сервера...", err);
    }
  }

  fetchPosts();
  setInterval(fetchPosts, 3000);
}

// --- 3. ФУНКЦИЯ ЛОКАЛЬНОГО УДАЛЕНИЯ ЗАМЕТКИ ---
function deleteNoteFromLocal(event, id) {
  if (event) event.stopPropagation();
  
  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  notes = notes.filter(note => note.id !== id);
  localStorage.setItem('obsidian_notes', JSON.stringify(notes));
  
  loadOnlyLocalNotes();
}

// --- 4. ШАБЛОН КАРТОЧЕК И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function buildCardHTML(note, isRecommendation = false) {
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

  const deleteBtnHtml = isRecommendation 
    ? `<button class="delete-btn" style="display:none;">×</button>`
    : `<button class="delete-btn" onclick="deleteNote(event, ${note.id})">×</button>`;

  return `
    ${deleteBtnHtml}
    <div class="card-author">@${escapeHTML(note.author || "Аноним")}</div>
    ${note.text ? `<div class="card-text">${escapeHTML(note.text)}</div>` : ''}
    ${audioHtml}
    <div class="card-meta">
      <span>${note.date}</span>
      <span>${note.scope === 'public' ? 'публичное' : 'личное'}</span>
    </div>
  `;
}

function loadOnlyLocalNotes() {
  const myFeed = document.getElementById('myFeed');
  if (!myFeed) return;

  myFeed.innerHTML = '';
  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');

  if (notes.length === 0) {
    myFeed.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px 0; font-size: 14px;">Поток пуст...</div>';
    return;
  }

  notes.forEach(note => {
    const cardMy = document.createElement('div');
    cardMy.className = 'glass-card';
    cardMy.innerHTML = buildCardHTML(note, false);
    cardMy.onclick = (e) => {
      if (!e.target.closest('.delete-btn') && !e.target.closest('.liquid-audio-player')) {
        try {
          if (typeof window.openOverlay === 'function') window.openOverlay(note.text ? escapeHTML(note.text) : "Медиазаметка");
        } catch(err) { console.log(err); }
      }
    };
    myFeed.appendChild(cardMy);
  });
}

function injectMediaStyles() {
  if (document.getElementById('media-injected-styles')) return;
  const style = document.createElement('style');
  style.id = 'media-injected-styles';
  style.innerHTML = `
    .upload-glass-button {
      position: absolute;
      right: 70px; 
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

function injectUploadButton() {
  const inputPanel = document.querySelector('.input-glass-panel');
  if (!inputPanel || document.getElementById('uploadBtn')) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'hidden-audio-file';
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const uploadBtn = document.createElement('div');
  uploadBtn.id = 'uploadBtn';
  uploadBtn.className = 'upload-glass-button';
  uploadBtn.innerHTML = `
    <svg class="upload-icon" viewBox="0 0 24 24">
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-3.31 2.69-6 6-6s6 2.69 6 6v13c0 4.42-3.58 8-8 8s-8-3.58-8-8V6h2v12c0 3.31 2.69 6 6 6s6-2.69 6-6V5c0-2.21-1.79-4-4-4s-4 1.79-4 4v12.5c0 1.1.9 2 2 2s2-.9 2-2V6h2z"/>
    </svg>
  `;

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      window.recordedAudioBase64 = reader.result;
      document.getElementById('noteText').placeholder = `🎵 Трек готов к отправке`;
    };
  });

  inputPanel.appendChild(uploadBtn);
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
