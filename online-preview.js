// --- ИНИЦИАЛИЗАЦИЯ СУТОЧНОГО ЦИКЛА ---
window.addEventListener('DOMContentLoaded', () => {
  injectTimerStyles();
  createGlobalTimerElement();
  startGlobalCountdown();
  
  // Перехватываем отрисовку медиа-ленты, чтобы внедрить логику растворения карточек
  const originalLoadNotes = window.loadLocalNotes;
  window.loadLocalNotes = () => {
    if (typeof originalLoadNotes === 'function') originalLoadNotes();
    applyTimeDissolveEffect();
  };
  
  // Запускаем первый цикл эффектов
  applyTimeDissolveEffect();
  // Постоянно обновляем прозрачность карточек раз в минуту
  setInterval(applyTimeDissolveEffect, 60000);
});

// --- 1. СТИЛИ ТАЙМЕРА И ЭФФЕКТА FOMO ---
function injectTimerStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    .timer-panel {
      width: 100%;
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 15px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .timer-countdown {
      font-family: monospace;
      font-weight: 700;
      color: #ff453a;
      text-shadow: 0 0 10px rgba(255, 69, 58, 0.3);
    }
    .time-badge {
      font-size: 10px;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.6);
    }
  `;
  document.head.appendChild(style);
}

// --- 2. ВНЕДРЕНИЕ ГЛОБАЛЬНОГО ТАЙМЕРА ПОД ШАПКУ ---
function createGlobalTimerElement() {
  const container = document.querySelector('.app-container');
  const tabs = document.querySelector('.main-tabs');
  
  if (!container || !tabs || document.getElementById('global-cycle-timer')) return;

  const timerDiv = document.createElement('div');
  timerDiv.id = 'global-cycle-timer';
  timerDiv.className = 'timer-panel';
  timerDiv.innerHTML = `
    <span style="color: rgba(255,255,255,0.4)">До очистки космоса рекомендаций:</span>
    <span id="countdown-clock" class="timer-countdown">00:00:00</span>
  `;
  
  // Вставляем аккуратно между заголовком и кнопками переключения
  container.insertBefore(timerDiv, tabs);
}

// --- 3. ЛОГИКА ОБРАТНОГО ОТСЧЕТА ДО ПОЛНОЧИ ---
function startGlobalCountdown() {
  const clock = document.getElementById('countdown-clock');
  if (!clock) return;

  function updateClock() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Установка на 00:00:00 следующего дня

    const diff = midnight - now;

    const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
    const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');

    clock.innerText = `${hours}:${minutes}:${seconds}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// --- 4. ЭФФЕКТ СУТОЧНОГО РАСТВОРЕНИЯ КАРТОЧЕК ---
function applyTimeDissolveEffect() {
  const recFeed = document.getElementById('recFeed');
  if (!recFeed) return;

  const cards = recFeed.querySelectorAll('.glass-card');
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  cards.forEach(card => {
    // Ищем мета-данные или завязываемся на текущее время, если это дефолтный пост
    // Находим блок с мета-данными или кнопкой удаления, чтобы вытащить ID (timestamp) карточки
    const deleteBtn = card.querySelector('.delete-btn');
    let postTimestamp = now;

    if (deleteBtn) {
      // Извлекаем id из функции deleteNote(event, id)
      const onclickAttr = deleteBtn.getAttribute('onclick');
      const match = onclickAttr ? onclickAttr.match(/\d+/) : null;
      if (match) postTimestamp = parseInt(match[0]);
    } else {
      // Для системного тестового поста по умолчанию задаем искусственное время (создан 4 часа назад)
      postTimestamp = now - (4 * 60 * 60 * 1000);
    }

    const elapsed = now - postTimestamp;
    const timeLeftMs = ONE_DAY_MS - elapsed;

    // Если пост старше 24 часов (в симуляции) — скрываем его полностью
    if (timeLeftMs <= 0) {
      card.style.display = 'none';
      return;
    }

    const hoursLeft = Math.ceil(timeLeftMs / (1000 * 60 * 60));

    // Добавляем или обновляем плашку оставшегося времени внутри карточки
    let badge = card.querySelector('.time-badge');
    if (!badge) {
      const meta = card.querySelector('.card-meta');
      if (meta) {
        badge = document.createElement('span');
        badge.className = 'time-badge';
        meta.appendChild(badge);
      }
    }
    if (badge) {
      badge.innerText = `исчезнет через ${hoursLeft}ч`;
    }

    // Рассчитываем коэффициент прозрачности (чем ближе к 24 часам, тем более тусклый пост)
    // Минимум оставляем 0.15, чтобы текст оставался слегка читаемым перед сгоранием
    const lifeRatio = timeLeftMs / ONE_DAY_MS; 
    const opacityValue = Math.max(0.15, lifeRatio).toFixed(2);
    
    // Плавное визуальное растворение «жидкого стекла»
    card.style.transition = 'opacity 0.5s ease, filter 0.5s ease';
    card.style.opacity = opacityValue;
    card.style.filter = `saturate(${Math.floor(lifeRatio * 100)}%)`;
  });
}
