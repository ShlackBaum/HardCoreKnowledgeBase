# Инструкция по настройке Telegram-бота (Google Apps Script)

## 1. Подготовка ключей
1.  **GitHub Token:**
    *   GitHub -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic).
    *   Generate new token -> Выбрать scope `repo` (Full control of private repositories).
    *   Скопировать токен (начинается на `ghp_...`).
2.  **Telegram Bot:**
    *   Написать @BotFather -> `/newbot`.
    *   Получить токен (начинается на `123456:ABC...`).

## 2. Создание скрипта
1.  Перейдите на [script.google.com](https://script.google.com/).
2.  Нажмите **"New Project"**.
3.  Скопируйте код из файла `bot.js` в редактор.
4.  **Заполните переменные вверху файла:**
    *   `GITHUB_TOKEN`
    *   `TELEGRAM_BOT_TOKEN`
    *   `REPO_OWNER` ('ShlackBaum')
    *   `REPO_NAME` ('HardCoreKnowledgeBase')

## 3. Деплой (Публикация)
1.  Справа вверху кнопка **Deploy** -> **New deployment**.
2.  Select type: **Web app**.
3.  Description: `v1`.
4.  Execute as: **Me**.
5.  Who has access: **Anyone** (Это важно! Чтобы Telegram мог достучаться. Сам скрипт проверяет Chat ID, если нужно).
6.  Нажмите **Deploy**.
7.  Скопируйте **Web App URL** (длинная ссылка `https://script.google.com/macros/s/.../exec`).

## 4. Подключение (Webhook)
1.  В коде скрипта найдите функцию `setWebhook`.
2.  Вставьте полученный URL в переменную `webAppUrl`.
3.  В редакторе выберите функцию `setWebhook` в выпадающем списке сверху.
4.  Нажмите кнопку ▶ **Run**.
5.  Если спросит разрешения — дайте (это ваш скрипт).

## 5. Тест
1.  Добавьте бота в чат команды.
2.  Напишите любое сообщение.
3.  Бот должен ответить "✅ Заметка сохранена".
4.  В папке `chaos` на GitHub появится файл.

