// --- ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ ---
let currentTab = 'my';
let currentScope = 'private';
let audioCtx = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBase64 = null;

// Настройка холста полноэкранных волн от кнопок
const canvas = document.getElementById('wave-canvas');
const ctx = canvas.getContext('2d');
let waves = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- АНИМАЦИЯ ЗВУКОВОЙ ВОЛНЫ ОТ КЛИКА (RIPPLE WAVE) ---
class ClickWave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = Math.max(canvas.width, canvas.height) * 1.2;
    this.speed = 15;
    this.opacity = 0.4;
    this.lineWidth = 4;
  }
  update() {
    this.radius += this.speed;
    this.opacity -= 0.006;
    this.lineWidth += 0.1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
  }
}

// Запуск анимации волны из точки клика по любой кнопке
document.addEventListener('click', (e) => {
  if (e.target.closest('button') || e.target.closest('.mic-glass-button') || e.target.closest('.privacy-btn')) {
    waves.push(new ClickWave(e.clientX, e.clientY));
    initAmbientAudio(); // Запуск Oneheart фонового эмбиента
  }
});

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  waves = waves.filter(w => w.opacity > 0 && w.radius < w.maxRadius);
  waves.forEach(w => {
    w.update();
    w.draw();
  });
  requestAnimationFrame(animate);
}
animate();

// --- ХОД РАБОТЫ ИНТЕРФЕЙСА ---
window.addEventListener('DOMContentLoaded', () => {
  loadLocalNotes();
  setupVoiceRecorder();
});

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabMy').classList.toggle('active', tab === 'my');
  document.getElementById('tabRec').classList.toggle('active', tab === 'rec');
  document.getElementById('myFeed').classList.toggle('hidden', tab !== 'my');
  document.getElementById('recFeed').classList.toggle('hidden', tab !== 'rec');
  document.getElementById('creatorSection').classList.toggle('hidden', tab !== 'my');
}

function setScope(scope) {
  currentScope = scope;
  document.getElementById('scopePrivate').classList.toggle('active', scope === 'private');
  document.getElementById('scopePublic').classList.toggle('active', scope === 'public');
}

// --- ЗАПИСЬ ГОЛОСА (LIQUID GLASS MICROPHONE) ---
function setupVoiceRecorder() {
  const micBtn = document.getElementById('micBtn');
  
  // Поддержка нажатия для телефонов и ПК
  const startEvents = ['mousedown', 'touchstart'];
  const endEvents = ['mouseup', 'mouseleave', 'touchend'];

  startEvents.forEach(evt => {
    micBtn.addEventListener(evt, async (e) => {
      e.preventDefault();
      if (mediaRecorder && mediaRecorder.state === "recording") return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            recordedAudioBase64 = reader.result;
            document.getElementById('noteText').placeholder = "🎤 Голосовая заметка готова к отправке...";
          };
        };

        mediaRecorder.start();
        micBtn.classList.add('recording');
      } catch (err) {
        console.error("Доступ к микрофону заблокирован:", err);
      }
    });
  });

  endEvents.forEach(evt => {
    micBtn.addEventListener(evt, (e) => {
      e.preventDefault();
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        micBtn.classList.remove('recording');
      }
    });
  });
}

// --- ОТПРАВКА И СОХРАНЕНИЕ ПОСТОВ ---
function sendPost() {
  const textarea = document.getElementById('noteText');
  const text = textarea.value.trim();
  
  if (!text && !recordedAudioBase64) return;

  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');
  const newNote = {
    id: Date.now(),
    text: text,
    audio: recordedAudioBase64,
    scope: currentScope,
    date: new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  };

  notes.unshift(newNote);
  localStorage.setItem('obsidian_notes', JSON.stringify(notes));

  // Очистка полей ввода
  textarea.value = '';
  recordedAudioBase64 = null;
  textarea.placeholder = "Зафиксируй состояние или зажми микрофон...";
  
  loadLocalNotes();
}

function loadLocalNotes() {
  const feed = document.getElementById('myFeed');
  feed.innerHTML = '';
  let notes = JSON.parse(localStorage.getItem('obsidian_notes') || '[]');

  if (notes.length === 0) {
    feed.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px 0; font-size: 14px;">Поток пуст...</div>';
    return;
  }

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    
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
      ${note.text ? `<div class="card-text">${escapeHTML(note.text)}</div>` : ''}
      ${audioHtml}
      <div class="card-meta">
        <span>${note.date}</span>
        <span>${note.scope === 'public' ? 'публичное' : 'личное'}</span>
      </div>
    `;
    feed.appendChild(card);
  });
}

// --- УПРАВЛЕНИЕ КАСТОМНЫМ ПЛЕЕРОМ ---
function toggleAudio(id) {
  const audio = document.getElementById(id);
  const btn = audio.previousElementSibling.previousElementSibling;
  
  // Останавливаем другие играющие плееры, если они есть
  document.querySelectorAll('audio').forEach(aud => {
    if(aud.id !== id) {
      aud.pause();
      aud.previousElementSibling.previousElementSibling.classList.remove('playing');
    }
  });

  if (audio.paused) {
    audio.play();
    btn.classList.add('playing');
  } else {
    audio.pause();
    btn.classList.remove('playing');
  }
}

function updateAudioProgress(id) {
  const audio = document.getElementById(id);
  const progress = document.getElementById(`progress-${id}`);
  const timeLabel = document.getElementById(`time-${id}`);
  
  if (audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${pct}%`;
    
    const mins = Math.floor(audio.currentTime / 60);
    const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
    timeLabel.innerText = `${mins}:${secs}`;
  }
}

function audioEnded(id) {
  const audio = document.getElementById(id);
  const btn = audio.previousElementSibling.previousElementSibling;
  btn.classList.remove('playing');
  document.getElementById(`progress-${id}`).style.width = '0%';
  document.getElementById(`time-${id}`).innerText = '0:00';
}

function seekAudio(e, id) {
  const audio = document.getElementById(id);
  const timeline = e.currentTarget;
  const pct = e.offsetX / timeline.offsetWidth;
  if(audio.duration) {
    audio.currentTime = pct * audio.duration;
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}

// --- МАТЕМАТИЧЕСКИЙ ЭМБИЕНТ (ONEHEART AMBIENT) ---
function initAmbientAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    document.getElementById('music-status').innerText = "ambient: on";
    document.getElementById('music-status').style.color = "#ffffff";

    createSynthWave(110, 0.2, -0.5); // Левая сторона
    createSynthWave(165, 0.15, 0.5); // Правая сторона
  } catch (e) {}
}

function createSynthWave(freq, maxVolume, pan) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(maxVolume, audioCtx.currentTime + 4);

  // Симуляция медленного затухания и накала звука
  setInterval(() => {
    let nextVol = Math.random() * maxVolume + 0.05;
    gain.gain.linearRampToValueAtTime(nextVol, audioCtx.currentTime + 4);
  }, 4000);

  if (panner) {
    panner.pan.setValueAtTime(pan, audioCtx.currentTime);
    osc.connect(gain).connect(panner).connect(audioCtx.destination);
  } else {
    osc.connect(gain).connect(audioCtx.destination);
  }
  osc.start();
}

// Регистрация PWA робота
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
