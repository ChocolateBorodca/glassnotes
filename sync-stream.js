// --- ОНЛАЙН СИНХРОНИЗАЦИЯ ЛЕНТЫ ЧЕРЕЗ FIREBASE ---
import { ref, push, onValue } from "https://gstatic.com";

window.addEventListener('DOMContentLoaded', () => {
  // Перехватываем функцию отправки постов, чтобы публичные летели в сеть
  window.sendPost = sendPostWithOnlineSync;
  
  // Принудительно перенаправляем клик кнопки на новую логику
  const submitBtn = document.querySelector('.submit-glass-btn');
  if (submitBtn) {
    submitBtn.removeAttribute('onclick');
    submitBtn.addEventListener('click', sendPostWithOnlineSync);
  }

  // Запускаем постоянное прослушивание онлайн-базы для вкладки Рекомендации
  listenToOnlineRecommendations();
});

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

  // ЕСЛИ ПУБЛИЧНОЕ — отправляем в глобальную базу Firebase Realtime Database
  if (scope === 'public') {
    try {
      const postsRef = ref(window.db, 'global_posts');
      push(postsRef, newNote);
      console.log("📡 Публичный пост успешно улетел в онлайн-космос Firebase!");
    } catch (err) {
      console.error("Ошибка отправки в облако:", err);
    }
  }

  // В любом случае сохраняем в локальную историю "Мои заметки", чтобы автор видел свой пост
  let localNotes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  localNotes.unshift(newNote);
  localStorage.setItem('obsidian_notes', JSON.stringify(localNotes));

  // Полная очистка интерфейса ввода
  textarea.value = '';
  window.recordedAudioBase64 = null;
  const hf = document.getElementById('hidden-audio-file');
  if (hf) hf.value = '';
  textarea.placeholder = "Зафиксируй состояние или зажми микрофон...";
  
  // Перерисовываем локальную ленту
  if (typeof window.loadLocalNotes === 'function') {
    window.loadLocalNotes();
  }
}

// --- 2. ЖИВОЙ ПОТОК: СКАЧИВАНИЕ РЕКОМЕНДАЦИЙ ИЗ СЕТИ В РЕАЛЬНОМ ВРЕМЕНИ ---
function listenToOnlineRecommendations() {
  const recFeed = document.getElementById('recFeed');
  if (!recFeed) return;

  const postsRef = ref(window.db, 'global_posts');

  // Вешаем живой триггер: как только кто-то в мире создаст пост, эта функция сработает сама без перезагрузки
  onValue(postsRef, (snapshot) => {
    recFeed.innerHTML = ''; // Очищаем старые посты

    // Дефолтный приветственный пост системы
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

    // Превращаем объект Firebase в массив и разворачиваем, чтобы новые были сверху
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

      // При клике на карточку открываем полноэкранный просмотр оверлея
      cardRec.onclick = (e) => {
        if (!e.target.closest('.liquid-audio-player')) {
          if (typeof window.openOverlay === 'function') {
            window.openOverlay(note.text ? escapeHTML(note.text) : "Медиазаметка");
          }
        }
      };

      // Вставляем карточку в ленту рекомендаций
      recFeed.appendChild(cardRec);
    });

    // Запускаем эффект суточного затухания прозрачности, если плагин подключен
    if (typeof window.applyTimeDissolveEffect === 'function') {
      window.applyTimeDissolveEffect();
    }
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}
