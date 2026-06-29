import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://gstatic.com";

window.addEventListener('DOMContentLoaded', () => {
  setupOnlineAuth();
});

function setupOnlineAuth() {
  // Находим кнопку входа, которая была создана на твоем экране авторизации
  // (Предполагаем, что у кнопки класс .login-btn или ищем единственную кнопку на стартовом экране)
  const loginBtn = document.querySelector('.auth-container button, .login-glass-panel button') || document.querySelector('button[onclick*="login"]');
  
  if (!loginBtn) {
    console.log("⚠️ Кнопка авторизации не найдена, ищем кастомные обработчики");
    return;
  }

  // Перехватываем стандартное событие клика
  loginBtn.removeAttribute('onclick');
  loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Находим поля ввода имени и пароля по тегам
    const inputs = document.querySelectorAll('.auth-container input, input[type="text"], input[type="password"]');
    if (inputs.length < 2) return;

    const username = inputs[0].value.trim().toLowerCase();
    const password = inputs[1].value.trim();

    if (!username || !password) {
      alert("Заполни имя и пароль");
      return;
    }

    if (password.length < 6) {
      alert("Пароль должен быть не менее 6 символов для защиты облака");
      return;
    }

    // Так как Firebase Auth требует email-формат, мы превращаем никнейм в системный email
    const fakeEmail = `${username}@notesclub.local`;

    try {
      // Попытка войти в существующий аккаунт
      const userCredential = await signInWithEmailAndPassword(window.auth, fakeEmail, password);
      console.log("🔒 Успешный вход в защищенный аккаунт:", userCredential.user.uid);
      
      // Сохраняем имя в локальную память для отображения автора @имя
      localStorage.setItem('notes_club_user', username);
      
      // Пропускаем на главный экран (вызываем старую функцию скрытия экрана авторизации, если она была)
      if (typeof window.enterApp === 'function') window.enterApp();

    } catch (error) {
      // Если аккаунт не найден (ошибка auth/user-not-found) — автоматически регистрируем его!
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const newCredential = await createUserWithEmailAndPassword(window.auth, fakeEmail, password);
          console.log("🛡️ Создан новый защищенный аккаунт в облаке:", newCredential.user.uid);
          
          localStorage.setItem('notes_club_user', username);
          if (typeof window.enterApp === 'function') window.enterApp();
        } catch (regError) {
          console.error("Ошибка регистрации:", regError);
          // Если пароль не подошел к существующему имени
          alert("Этот никнейм уже занят, или пароль неверный.");
        }
      } else {
        console.error("Ошибка авторизации:", error);
        alert("Ошибка сети. Попробуй еще раз.");
      }
    }
  });
}
