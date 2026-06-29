// --- ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ ---
let currentTab = 'my';
window.currentScope = 'private'; // Делаем scope глобальным
let audioCtx = null;
let mediaRecorder = null;
let audioChunks = [];
window.recordedAudioBase64 = null; // Делаем аудио глобальным, чтобы media.js его видел

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
    this.speed = 10;
    this.opacity = 0.4;
    this.lineWidth = 2;
  }
  update() {
    this.radius += this.speed;
    this.opacity -= 0.005;
    this.lineWidth += 0.05;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.liquid-glass-btn') || e.target.closest('.mic-glass-button') || e.target.closest('.privacy-btn')) {
    waves.push(new ClickWave(e.clientX, e.clientY));
    initAmbientAudio(); 
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
  if (typeof window.loadLocalNotes !== 'function') {
    loadLocalNotes();
  }
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
  window.currentScope = scope;
  document.getElementById('scopePrivate').classList.toggle('active', scope === 'private');
  document.getElementById('scopePublic').classList.toggle('active', scope === 'public');
}

// --- ЗАПИСЬ ГОЛОСА ---
function setupVoiceRecorder() {
  const micBtn = document.getElementById('micBtn');
  if (!micBtn) return;
  
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
            window.recordedAudioBase64 = reader.result;
            document.getElementById('noteText').placeholder = "🎤 Голосовая заметка готова к отправке...";
          };
        };

        mediaRecorder.start();
        micBtn.classList.add('recording');
      } catch (err) {
        console.error(err);
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

// --- СТАНДАРТНЫЕ ФУНКЦИИ (БУДУТ ПЕРЕЗАПИСАНЫ БОЛЕЕ НОВЫМИ СКРИПТАМИ) ---
function sendPost() {
  if (typeof window.sendPost === 'function' && window.sendPost !== sendPost) {
    window.sendPost();
    return;
  }
}

function loadLocalNotes() {
  if (typeof window.loadLocalNotes === 'function' && window.loadLocalNotes !== loadLocalNotes) {
    window.loadLocalNotes();
    return;
  }
}

// --- УПРАВЛЕНИЕ ПЛЕЕРОМ ---
function toggleAudio(id) {
  const audio = document.getElementById(id);
  if (!audio) return;
  const btn = audio.previousElementSibling.previousElementSibling;
  
  document.querySelectorAll('audio').forEach(aud => {
    if(aud.id !== id) {
      aud.pause();
      const currentBtn = aud.previousElementSibling?.previousElementSibling;
      if (currentBtn) currentBtn.classList.remove('playing');
    }
  });

  if (audio.paused) {
    audio.play();
    if (btn) btn.classList.add('playing');
  } else {
    audio.pause();
    if (btn) btn.classList.remove('playing');
  }
}

function updateAudioProgress(id) {
  const audio = document.getElementById(id);
  const progress = document.getElementById(`progress-${id}`);
  const timeLabel = document.getElementById(`time-${id}`);
  
  if (audio && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    if (progress) progress.style.width = `${pct}%`;
    
    const mins = Math.floor(audio.currentTime / 60);
    const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
    if (timeLabel) timeLabel.innerText = `${mins}:${secs}`;
  }
}

function audioEnded(id) {
  const audio = document.getElementById(id);
  if (!audio) return;
  const btn = audio.previousElementSibling.previousElementSibling;
  if (btn) btn.classList.remove('playing');
  if (document.getElementById(`progress-${id}`)) document.getElementById(`progress-${id}`).style.width = '0%';
  if (document.getElementById(`time-${id}`)) document.getElementById(`time-${id}`).innerText = '0:00';
}

function seekAudio(e, id) {
  const audio = document.getElementById(id);
  const timeline = e.currentTarget;
  const pct = e.offsetX / timeline.offsetWidth;
  if(audio && audio.duration) {
    audio.currentTime = pct * audio.duration;
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}

function initAmbientAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const status = document.getElementById('music-status');
    if (status) {
      status.innerText = "ambient: on";
      status.style.color = "#ffffff";
    }
    createSynthWave(110, 0.2, -0.5); 
    createSynthWave(165, 0.15, 0.5); 
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

  setInterval(() => {
    if (!audioCtx) return;
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
