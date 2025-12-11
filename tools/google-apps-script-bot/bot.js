// ==========================================
// CONFIGURATION (Заполни эти поля)
// ==========================================
const GITHUB_TOKEN = 'ghp_ВАШ_ТОКЕН'; // Personal Access Token (Classic) с правами 'repo'
const REPO_OWNER = 'ShlackBaum';      // Ваш ник
const REPO_NAME = 'HardCoreKnowledgeBase'; // Название репо
const TARGET_FOLDER = 'chaos';        // Папка куда класть заметки
const TELEGRAM_BOT_TOKEN = '123456:ABC-ВАШ_ТЕЛЕГРАМ_ТОКЕН';
const ALLOWED_CHAT_ID = '-100...';    // ID чата (опционально, для защиты от чужих)

// ==========================================
// MAIN LOGIC
// ==========================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const message = data.message;
    
    if (!message || !message.text) return;

    const user = message.from.username || "Anon";
    const text = message.text;
    
    // Генерируем имя файла: 12-12-25-shlackbaum-1430.md
    const date = new Date();
    const dateStr = Utilities.formatDate(date, "GMT+3", "dd-MM-yy");
    const timeStr = Utilities.formatDate(date, "GMT+3", "HHmm");
    const filename = `${dateStr}-${user}-${timeStr}.md`;
    
    // Формируем контент файла
    const fileContent = `# Заметка от @${user}\n\n${text}\n\n---\nAdded via Telegram Bot`;
    
    // Отправляем в GitHub
    const result = uploadToGitHub(filename, fileContent);
    
    if (result.success) {
      sendMessage(message.chat.id, `✅ Заметка сохранена: ${filename}`);
    } else {
      sendMessage(message.chat.id, `❌ Ошибка сохранения: ${result.error}`);
    }
    
  } catch (error) {
    // Log error (можно отправить себе в личку)
  }
}

// Функция загрузки файла на GitHub
function uploadToGitHub(filename, content) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${TARGET_FOLDER}/${filename}`;
  
  // Кодируем контент в Base64 (требование GitHub API)
  const contentEncoded = Utilities.base64Encode(content, Utilities.Charset.UTF_8);
  
  const payload = {
    "message": `feat(bot): new note from @${filename.split('-')[3]}`,
    "content": contentEncoded,
    "branch": "main"
  };
  
  const options = {
    "method": "put",
    "headers": {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() === 201) {
    return { success: true };
  } else {
    return { success: false, error: json.message };
  }
}

// Функция отправки ответа в Телеграм
function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    "chat_id": chatId,
    "text": text,
    "parse_mode": "Markdown"
  };
  const options = {
    "method": "post",
    "payload": payload
  };
  UrlFetchApp.fetch(url, options);
}

// Функция для установки Вебхука (Запусти меня один раз вручную!)
function setWebhook() {
  const webAppUrl = "ВСТАВЬ_СЮДА_URL_ИЗ_DEPLOY"; 
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webAppUrl}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

