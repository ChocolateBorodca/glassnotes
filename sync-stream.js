// --- ОНЛАЙН СИНХРОНИЗАЦИЯ ЛЕНТЫ ЧЕРЕЗ FIREBASE ---
import { ref, push, onValue } from "https://gstatic.com";

// Перехватываем функции сразу при чтении файла
window.sendPost = sendPostWithOnlineSync;

setTimeout(() => {
  // Намертво привязываем клик кнопки «Отправить» к сетевой отправке
  const submitBtn = document.querySelector('.submit-glass-btn');
  if (submitBtn) {
    submitBtn.removeAttribute('onclick');
    submitBtn.addEventListener('click', sendPostWithOnlineSync);
  }

  // Запускаем прослушивание живой базы для вкладки Рекомендации
  listenToOnlineRecommendations();
}, 100);

// --- 1. УМНАЯ ОТПРАВКА: ЛИЧНОЕ В LOCALSTORAGE, ПУБЛИЧНОЕ В ОБЛАКО ---
function sendPostWithOnlineSync() {
  const textarea = document.getElementById('noteText');
  const text = textarea.value.trim();
  
  if (!text && !window.recordedAudioBase64) return;

  const currentAuthor = localStorage.getItem('notes_club_user') || 'Аноним';
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

  // Если ПУБЛИЧНОЕ — отправляем в глобальную базу Firebase
  if (scope === 'public') {
    try {
      const postsRef = ref(window.db, 'global_posts');
      push(postsRef, newNote);
      console.log("📡 Публичный пост успешно улетел в онлайн-космос Firebase!");
    } catch (err) {
      console.error("Ошибка отправки в облако:", err);
    }
  }

  // В любом случае дублируем в локальную историю "Заметки" автора
  let localNotes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  localNotes.unshift(newNote);
  localStorage.setItem('obsidian_notes', JSON.stringify(localNotes));

  // Очистка интерфейса ввода
  textarea.value = '';
  window.recordedAudioBase64 = null;
  const hf = document.getElementById('hidden-audio-file');
  if (hf) hf.value = '';
  textarea.placeholder = "Зафиксируй состояние или зажми микрофон...";
  
  if (typeof window.loadLocalNotes === 'function') {
    window.loadLocalNotes();
  }
}

// --- 2. ЖИВОЙ ПОТОК: СКАЧИВАНИЕ ИЗ СЕТИ В РЕАЛЬНОМ ВРЕМЕНИ ---
function listenToOnlineRecommendations() {
  const recFeed = document.getElementById('recFeed');
  if (!recFeed) return;

  const postsRef = ref(window.db, 'global_posts');

  onValue(postsRef, (snapshot) => {
    recFeed.innerHTML = ''; // Очищаем старые посты

    // Базовый системный пост
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

    const data = snapshot.val();
    if (!data) return;

    // Сортируем массив, чтобы свежие онлайн-посты были сверху
    const onlinePosts = Object.values(data).reverse();

    onlinePosts.forEach(note => {
      const cardRec = document.createElement('div');
      cardRec.className = 'glass-card';
      
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

      cardRec.innerHTML = `
        <button class="delete-btn" onclick="deleteNote(event, ${note.id})" style="display:none;">×</button>
        <div class="card-author">@${escapeHTML(note.author || "Аноним")}</div>
        ${note.text ? `<div class="card-text">${escapeHTML(note.text)}</div>` : ''}
        ${audioHtml}
        <div class="card-meta">
          <span>${note.date}</span>
          <span>публичное</span>
        </div>
      `;

      cardRec.onclick = (e) => {
        if (!e.target.closest('.liquid-audio-player')) {
          if (typeof window.openOverlay === 'function') {
            window.openOverlay(note.text ? escapeHTML(note.text) : "Медиазаметка");
          }
        }
      };

      recFeed.appendChild(cardRec);
    });

    if (typeof window.applyTimeDissolveEffect === 'function') {
      window.applyTimeDissolveEffect();
    }
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}
