// ==========================================
// MAIN LOGIC
// ==========================================

function doPost(e) {
  try {
    if (!e || !e.postData) return;
    const update = JSON.parse(e.postData.contents);
    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return;
    
    // 1. ПАРСИНГ MARKDOWN
    var formattedText = applyTelegramFormatting(msg.text, msg.entities);

    // 2. ПРОВЕРКИ
    const botUsername = "HardCoreKnowledgeAppend_bot";
    const isPrivate = msg.chat.type === "private";
    const hasMention = msg.text.includes("@" + botUsername);

    if (!isPrivate && !hasMention) return;

    var cleanText = formattedText.replace("@" + botUsername, "").trim();
    if (!cleanText) return; 

    // 3. ЗАГОЛОВОК (Умный поиск первой строки с текстом)
    var lines = cleanText.split('\n');
    var humanTitle = "";
    
    for (var i = 0; i < lines.length; i++) {
      // Чистим строку от Markdown
      var line = lines[i].replace(/[*_`\[\]]/g, '').trim();
      // Разбиваем на слова
      var words = line.split(/\s+/);
      // Фильтруем мусор: теги (@...), ссылки (http), скобки
      var meaningfulWords = words.filter(function(w) { 
        return w && !w.startsWith('@') && !w.startsWith('http') && !w.startsWith('('); 
      });
      
      if (meaningfulWords.length > 0) {
        humanTitle = meaningfulWords.slice(0, 7).join(' ');
        break; 
      }
    }
    
    if (!humanTitle) humanTitle = "Заметка без названия";

    // 4. ДАННЫЕ
    const user = msg.from.username || msg.from.first_name || "Anon";
    const dateObj = new Date();
    
    // Меню: Только заголовок (без даты и юзера)
    const menuTitle = humanTitle;
    
    // Файл: Дата-Юзер
    const fileDate = Utilities.formatDate(dateObj, "GMT+3", "dd-MM-HHmm");
    const seconds = Utilities.formatDate(dateObj, "GMT+3", "ss");
    const filename = fileDate + seconds + "-" + user + ".md"; 
    
    const content = "# " + humanTitle + "\n\n**Дата:** " + Utilities.formatDate(dateObj, "GMT+3", "dd.MM.yyyy HH:mm") + "\n**Автор:** @" + user + "\n\n---\n\n" + cleanText;
    
    // 5. ЗАГРУЗКА
    const noteRes = uploadToGitHub("chaos/" + filename, content);
    if (!noteRes.success) throw new Error("Upload failed: " + noteRes.error);
    
    // 6. МЕНЮ
    var safeMenuTitle = menuTitle.substring(0, 60) + (menuTitle.length > 60 ? "..." : "");
    const summaryRes = updateSummary(filename, safeMenuTitle);
    
    // 7. ОТВЕТ
    var replyText = "✅ Сохранено:\n" + safeMenuTitle;
    if (!summaryRes.success) replyText += "\n⚠️ Меню не обновлено.";
    
    reply(msg.chat.id, replyText, msg.message_id);
    
  } catch (err) {
    console.error(err);
    if (e && e.postData) {
       const m = JSON.parse(e.postData.contents).message;
       if (m && m.chat.type === "private") {
         reply(m.chat.id, "❌ Error: " + err.toString());
       }
    }
  }
}

// === ПАРСЕР MARKDOWN ===
function applyTelegramFormatting(text, entities) {
  if (!entities || entities.length === 0) return text;
  
  entities.sort(function(a, b) { return b.offset - a.offset; });
  
  var result = text;
  var newline = String.fromCharCode(10);
  
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var start = e.offset;
    var end = e.offset + e.length;
    
    var prefix = "";
    var suffix = "";
    
    if (e.type === 'bold') {
      prefix = "**"; suffix = "**";
    } else if (e.type === 'italic') {
      prefix = "_"; suffix = "_";
    } else if (e.type === 'code') {
      prefix = "`"; suffix = "`";
    } else if (e.type === 'pre') {
      prefix = "```" + newline; suffix = newline + "```";
    } else if (e.type === 'text_link') {
      prefix = "["; suffix = "](" + e.url + ")";
    }
    
    if (prefix !== "") {
      result = result.substring(0, start) + prefix + result.substring(start, end) + suffix + result.substring(end);
    }
  }
  return result;
}

// === API ===
function uploadToGitHub(path, content, sha) {
  const url = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + path;
  
  var payload = {
    message: "feat(bot): add " + path,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: "main"
  };
  if (sha) payload.sha = sha;
  
  const options = {
    method: "put",
    headers: { "Authorization": "token " + GITHUB_TOKEN, "Accept": "application/vnd.github.v3+json" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(res.getContentText());
  
  var success = (res.getResponseCode() === 201 || res.getResponseCode() === 200);
  return { success: success, error: json.message, sha: json.content ? json.content.sha : null };
}

function getFile(path) {
  const url = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + path;
  const options = { headers: { "Authorization": "token " + GITHUB_TOKEN }, muteHttpExceptions: true };
  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() !== 200) return null;
  const json = JSON.parse(res.getContentText());
  const decoded = Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
  return { content: decoded, sha: json.sha };
}

function updateSummary(newFileName, title) {
  const file = getFile("SUMMARY.md");
  if (!file) return { success: false, error: "SUMMARY.md not found" };
  
  var text = file.content;
  const chaosHeader = "## ХАОС (Inbox)";
  const entry = "* [" + title + "](chaos/" + newFileName + ")";
  
  if (text.includes(chaosHeader)) {
    text = text.replace(chaosHeader, chaosHeader + "\n" + entry);
  } else {
    text += "\n\n" + chaosHeader + "\n" + entry;
  }
  
  return uploadToGitHub("SUMMARY.md", text, file.sha);
}

function reply(chatId, text, replyId) {
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
    method: "post",
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, reply_to_message_id: replyId, disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}

function setWebhook() {
  // Вставьте URL из Deploy
  const url = "https://script.google.com/macros/s/AKfycbyBIjOwNqcOftfBaHSYc7eJDQIK1rFljnQpvgcoXyaQogAi8sMnN9FA_Tlo16QTvRxoYA/exec";
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + url);
}

