// ==========================================
// CONFIGURATION (Заполни сам!)
// ==========================================
const GITHUB_TOKEN = 'ВСТАВЬТЕ_ВАШ_ТОКЕН'; 
const REPO_OWNER = 'ShlackBaum';
const REPO_NAME = 'HardCoreKnowledgeBase';
const BOT_TOKEN = '7755430110:AAFRFtBAlgYxtsPNJWAwlUkCdUf7TeYRqAs';

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

    // 3. ЗАГОЛОВОК (Умный поиск)
    var lines = cleanText.split('\n');
    var humanTitle = "";
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/[*_`\[\]]/g, '').trim();
      var words = line.split(/\s+/);
      // Фильтруем мусор
      var meaningfulWords = words.filter(function(w) { 
        return w && !w.startsWith('@') && !w.startsWith('http') && !w.startsWith('('); 
      });
      
      if (meaningfulWords.length > 0) {
        // Берем 7 слов для заголовка
        humanTitle = meaningfulWords.slice(0, 7).join(' ');
        break; 
      }
    }
    
    if (!humanTitle) humanTitle = "Заметка без названия";

    // 4. ДАННЫЕ
    const user = msg.from.username || msg.from.first_name || "Anon";
    const dateObj = new Date();
    
    // Меню: Только заголовок
    const menuTitle = humanTitle;
    
    // Файл: Транслит заголовка (для URL)
    // Формат: dd-mm-yy-translit-title.md
    const datePrefix = Utilities.formatDate(dateObj, "GMT+3", "dd-MM-yy");
    const translitTitle = transliterate(humanTitle).substring(0, 50); // Ограничим длину
    const filename = datePrefix + "-" + translitTitle + ".md"; 
    
    const content = "# " + humanTitle + "\n\n**Дата:** " + Utilities.formatDate(dateObj, "GMT+3", "dd.MM.yyyy HH:mm") + "\n**Автор:** @" + user + "\n\n---\n\n" + cleanText;
    
    // 5. ЗАГРУЗКА
    const noteRes = uploadToGitHub("chaos/" + filename, content);
    if (!noteRes.success) throw new Error("Upload failed: " + noteRes.error);
    
    // 6. МЕНЮ
    const summaryRes = updateSummary(filename, menuTitle);
    
    // 7. ОТВЕТ
    var replyText = "✅ Сохранено:\n" + menuTitle + "\n(" + filename + ")";
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

// === ТРАНСЛИТЕРАЦИЯ ===
function transliterate(text) {
  var rus = "щ   ш  ч  ц  ю  я  ё  ж  ъ  ы  э  а б в г д е з и й к л м н о п р с т у ф х ь".split(/ +/g);
  var eng = "shh sh ch cz yu ya yo zh `` y' e` a b v g d e z i j k l m n o p r s t u f x `".split(/ +/g);
  
  var res = text.toLowerCase();
  
  for (var i = 0; i < rus.length; i++) {
    res = res.split(rus[i]).join(eng[i]);
  }
  
  // Заменяем всё кроме букв и цифр на дефис
  res = res.replace(/[^a-z0-9]/g, "-");
  // Убираем дубли дефисов
  res = res.replace(/-+/g, "-");
  // Убираем дефисы по краям
  res = res.replace(/^-|-$/g, "");
  
  if (!res) res = "note";
  return res;
}

// === ПАРСЕР MARKDOWN ===
function applyTelegramFormatting(text, entities) {
  if (!entities || entities.length === 0) return text;
  entities.sort(function(a, b) { return b.offset - a.offset; });
  var result = text;
  var newline = String.fromCharCode(10);
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var start = e.offset; var end = e.offset + e.length;
    var prefix = ""; var suffix = "";
    if (e.type === 'bold') { prefix = "**"; suffix = "**"; } 
    else if (e.type === 'italic') { prefix = "_"; suffix = "_"; } 
    else if (e.type === 'code') { prefix = "`"; suffix = "`"; } 
    else if (e.type === 'pre') { prefix = "```" + newline; suffix = newline + "```"; } 
    else if (e.type === 'text_link') { prefix = "["; suffix = "](" + e.url + ")"; }
    if (prefix !== "") { result = result.substring(0, start) + prefix + result.substring(start, end) + suffix + result.substring(end); }
  }
  return result;
}

// === API ===
function uploadToGitHub(path, content, sha) {
  const url = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + path;
  var payload = { message: "feat(bot): add " + path, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8), branch: "main" };
  if (sha) payload.sha = sha;
  const options = { method: "put", headers: { "Authorization": "token " + GITHUB_TOKEN, "Accept": "application/vnd.github.v3+json" }, payload: JSON.stringify(payload), muteHttpExceptions: true };
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
  if (text.includes(chaosHeader)) { text = text.replace(chaosHeader, chaosHeader + "\n" + entry); } 
  else { text += "\n\n" + chaosHeader + "\n" + entry; }
  return uploadToGitHub("SUMMARY.md", text, file.sha);
}

function reply(chatId, text, replyId) {
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", { method: "post", contentType: 'application/json', payload: JSON.stringify({ chat_id: chatId, text: text, reply_to_message_id: replyId, disable_web_page_preview: true }), muteHttpExceptions: true });
}

function setWebhook() {
  const url = "https://script.google.com/macros/s/AKfycbyBIjOwNqcOftfBaHSYc7eJDQIK1rFljnQpvgcoXyaQogAi8sMnN9FA_Tlo16QTvRxoYA/exec";
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + url);
}
