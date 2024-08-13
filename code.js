function doPost(e) {
  try {

    const appSettings = PropertiesService.getScriptProperties();
    const API_KEY = appSettings.getProperty('CHATWORK_API_KEY');
    const ROOM_ID = appSettings.getProperty('CHATWORK_ROOM_ID');
    const MY_ACCOUNT_ID = appSettings.getProperty('MY_ACCOUNT_ID'); 

    const contents = JSON.parse(e.postData.contents);
    Logger.log('Webhook payload: ' + JSON.stringify(contents));

    var message = contents.webhook_event.body;
    var roomId = contents.webhook_event.room_id;
    var messageId = contents.webhook_event.message_id;
    var fromAccountId = contents.webhook_event.account_id;

    if (fromAccountId == MY_ACCOUNT_ID) {
      Logger.log('自分自身のメッセージです。スキップします。');
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    const processedMessagesJSON = PropertiesService.getUserProperties().getProperty('processedMessages') || '{}';
    const processedMessages = JSON.parse(processedMessagesJSON);

    if (processedMessages[messageId]) {
      Logger.log('メッセージは既に処理されています。スキップします。');
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    if (message === 'test') {
      Logger.log("デバッグメッセージが検出されました！");
      var debugMessage = "Message Info:\n" +
                         "From Account ID: " + fromAccountId + "\n" +
                         "Room ID: " + roomId + "\n" +
                         "Message ID: " + messageId + "\n" +
                         "Message: " + message;
      sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, debugMessage);
    } else if (message.includes('[dtext:chatroom_chat_joined]')) {
      Logger.log("参加メッセージが検出されました！");
      sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, "よろしく！");
    } else if (message ==='おやすみ') {
      Logger.log("おやすみメッセージが検出されました！");
      sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, "いい夢見てね！");
    } else if (message.includes('おはよう')) {
      Logger.log("おはようメッセージが検出されました！");
      sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, "いい夢見れた？");
    } else if (message.includes('(´・ω・｀)')) {
      Logger.log("顔文字メッセージが検出されました！");
      sendMessageWithoutReply(API_KEY, ROOM_ID, "(´・ω・｀)"); 
    } else if (message.includes('(´･ω･`)')) {
      Logger.log("顔文字メッセージが検出されました！");
      sendMessageWithoutReply(API_KEY, ROOM_ID, "(´･ω･`)");
    } else if ((message.includes('可愛い') || message.includes('かわいい')) && (message.includes('[To:#]') || message.includes('aid=#'))) {　//'aid＝#'と'[To:#]'の#にはbotアカウントのアカウントidを
      Logger.log("「可愛い」メッセージが検出されました！");
      const replyMessage = getRandomReply();
      sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, "\n" + replyMessage);
    } else if (message ==='おみくじ') {
      Logger.log("おみくじメッセージが検出されました！");
      if (canDrawOmikuji(fromAccountId)) {
        const omikujiResult = getOmikujiResult();
        incrementOmikujiCount(fromAccountId);
        sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, '\n' + omikujiResult);
      } else {
        sendReply(API_KEY, ROOM_ID, messageId, fromAccountId, roomId, "おみくじは1日3回までです。");
      }
    } else {
      Logger.log('指定されたメッセージは検出されませんでした');
    }

    processedMessages[messageId] = true;
    PropertiesService.getUserProperties().setProperty('processedMessages', JSON.stringify(processedMessages));

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput('Error').setMimeType(ContentService.MimeType.TEXT);
  }
}

function sendReply(API_KEY, ROOM_ID, messageId, accountId, roomId, replyMessage) {
  const replyText = `[rp aid=${accountId} to=${roomId}-${messageId}] ${replyMessage}`;
  const url = `https://api.chatwork.com/v2/rooms/${ROOM_ID}/messages`;

  const options = {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: `body=${encodeURIComponent(replyText)}`
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}

function sendMessageWithoutReply(API_KEY, ROOM_ID, message) {
  const url = `https://api.chatwork.com/v2/rooms/${ROOM_ID}/messages`;

  const options = {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: `body=${encodeURIComponent(message)}`
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}

function getOmikujiResult() {
  const random = Math.random() * 100;
  if (random < 0.5) return "大大吉"; 
  else if (random < 1.5) return "大凶"; 
  else if (random < 5.5) return "半吉"; 
  else if (random < 10.5) return "末小吉"; 
  else if (random < 20.5) return "小吉"; 
  else if (random < 30.5) return "末吉"; 
  else if (random < 53.5) return "吉"; 
  else if (random < 83.5) return "凶"; 
  else return "大吉"; 
}

function canDrawOmikuji(accountId) {
  const properties = PropertiesService.getUserProperties();
  const today = new Date().toDateString(); 
  const key = `omikujiCount_${accountId}_${today}`;
  const count = Number(properties.getProperty(key)) || 0;
  return count < 3;
}

function incrementOmikujiCount(accountId) {
  const properties = PropertiesService.getUserProperties();
  const today = new Date().toDateString(); 
  const key = `omikujiCount_${accountId}_${today}`;
  const count = Number(properties.getProperty(key)) || 0;
  properties.setProperty(key, count + 1);
}

function getRandomReply() {
  const replies = [
    '照れる（*\'艸*）',
    'ありがとう(´∀｀*)',
    'ありがとう( 人´∀｀)',
    '⭐︎',
    ':*',
    'ჱ̒⸝⸝•̀֊•́⸝⸝)♡',
    '(՞ ܸ. .ܸ ՞)"',
    '(՞˶･֊･˶՞)🤍',
    '꒰ঌ .°(*´˘`*)°. ໒꒱'
  ];
  const randomIndex = Math.floor(Math.random() * replies.length);
  return replies[randomIndex];
}
