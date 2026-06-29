// --- АВТОНОМНОЕ ПОДКЛЮЧЕНИЕ ОНЛАЙН-МОДУЛЕЙ FIREBASE ---
import { initializeApp } from "https://gstatic.com";
import { getAuth } from "https://gstatic.com";
import { getDatabase } from "https://gstatic.com";

// Твой уникальный подтвержденный конфиг из консоли Google
const firebaseConfig = {
  apiKey: "AIzaSy880HS3qOzB5100hyp36DGZh2BU5_0p08w",
  authDomain: "://firebaseapp.com",
  projectId: "notes-club-4a308",
  storageBucket: "notes-club-4a308.firebasestorage.app",
  messagingSenderId: "173655533026",
  appId: "1:173655533026:web:61a69771e8d784cc54c5bb",
  measurementId: "G-JJ530E031F"
};

// Запуск облачного движка
const app = initializeApp(firebaseConfig);

// Регистрируем глобальные модули в системе, чтобы их видели будущие онлайн-файлы
window.auth = getAuth(app);
window.db = getDatabase(app);

console.log("🪐 Notes Club успешно подключен к облачной сети Firebase!");

// МАГИЧЕСКАЯ СТРОКА: Сами загружаем живую ленту в обход index.html
import("./sync-stream.js").catch(err => console.error("Ошибка загрузки потока:", err));
