const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Включаем CORS, чтобы твой сайт на GitHub Pages мог общаться с этим сервером
app.use(cors());

// Лимит на 50 Мегабайт, чтобы большие музыкальные треки из галереи не блокировались
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Хранилище постов в оперативной памяти сервера
let globalPosts = [];

// Системный пост по умолчанию
const systemPost = {
  id: 1,
  text: "Всё вокруг кажется симуляцией, пока ты не зальешь это в клуб. Независимый Node.js сервер успешно запущен в РФ.",
  audio: null,
  scope: "public",
  author: "system",
  date: new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
};
globalPosts.push(systemPost);

// --- РОБОТ СУТОЧНОГО ВЫГОРАНИЯ (Проверка каждые 10 секунд) ---
setInterval(() => {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  // Оставляем только те постов, у которых возраст меньше 24 часов (кроме системного)
  globalPosts = globalPosts.filter(post => {
    if (post.id === 1) return true; // Системный пост не удаляем
    return (now - post.id) < ONE_DAY_MS;
  });
}, 10000);

// --- МАРШРУТЫ (API) ---

// 1. Получить все публичные посты за последние 24 часа
app.get('/api/posts', (req, res) => {
  // Возвращаем массив в обратном порядке, чтобы новые были сверху
  res.json([...globalPosts].reverse());
});

// 2. Опубликовать новый пост
app.post('/api/posts', (req, res) => {
  const { id, text, audio, scope, author, date } = req.body;
  
  if (!text && !audio) {
    return res.status(400).json({ error: "Пустой пост" });
  }

  const newNote = {
    id: id || Date.now(),
    text: text || null,
    audio: audio || null,
    scope: scope || 'public',
    author: author || 'Аноним',
    date: date || new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  };

  globalPosts.push(newNote);
  console.log(`📡 Добавлен онлайн-пост от @${newNote.author}`);
  res.status(201).json({ success: true, post: newNote });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер Notes Club запущен на порту ${PORT}`);
});
