const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = 8000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex to detect URLs

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  const welcomeMessage = `<b>Hello, ${username}!</b>\n\n`
    + `<b>Welcome to the IndiaEarnX URL Shortener Bot!</b>\n`
    + `<b>You can use this bot to shorten URLs using the indiaearnx.com API service.</b>\n\n`
    + `<b>To shorten a URL, just type or paste the URL directly in the chat, and the bot will provide you with the shortened URL.</b>\n\n`
    + `<b>If you haven't set your IndiaEarnX API token yet, use the command:</b>\n<code>/setapi YOUR_IndiaEarnx_API_TOKEN</code>\n\n`
    + `<b>Example:</b>\n<code>/setapi c49399f821fc020161bc2a31475ec59f35ae5b4</code>`;

  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: "Chat with Admin", url: "t.me/IndiaEarnXsupport" },
          { text: "Payment Proof", url: "t.me/IndiaEarnx_Payment_Proofs" }
        ],
        [
          { text: "Get API Token from Here", url: "https://indiaearnx.com/member/tools/quick" }
        ]
      ]
    })
  };

  bot.sendPhoto(chatId, "https://envs.sh/dn1.jpg", {
    caption: welcomeMessage,
    parse_mode: "HTML",
    reply_markup: options.reply_markup
  });
});

// Command: /setapi
bot.onText(/\/setapi (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userToken = match[1].trim();

  saveUserToken(chatId, userToken);
  bot.sendMessage(chatId, `IndiaEarnX API token set successfully.`);
});

// Handle messages with links, including forwarded messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || msg.caption; // Captures text from regular messages and captions of forwarded posts

  if (!messageText) return;

  const links = messageText.match(urlRegex);

  if (links && links.length > 0) {
    const userToken = getUserToken(chatId);
    
    if (!userToken) {
      bot.sendMessage(chatId, "Please provide your IndiaEarnX API token first. Use the command: /setapi YOUR_IndiaEarnX_API_TOKEN");
      return;
    }

    let updatedMessage = messageText;
    let shortenedLinks = [];

    for (const link of links) {
      const shortUrl = await shortenUrl(userToken, link);
      if (shortUrl) {
        shortenedLinks.push(shortUrl);
        updatedMessage = updatedMessage.replace(link, shortUrl);
      }
    }

    if (shortenedLinks.length > 0) {
      // Send a new message with the same formatting as the original
      if (msg.text) {
        bot.sendMessage(chatId, `<b>Updated Post:</b>\n\n${updatedMessage}`, { parse_mode: "HTML" });
      } else if (msg.caption) {
        bot.sendPhoto(chatId, msg.photo[msg.photo.length - 1].file_id, {
          caption: updatedMessage,
          parse_mode: "HTML"
        });
      }
    } else {
      bot.sendMessage(chatId, "An error occurred while shortening the URLs.");
    }
  }
});

// Function to shorten a URL
async function shortenUrl(apiToken, url) {
  try {
    const apiUrl = `https://indiaearnx.com/api?api=${apiToken}&url=${url}`;
    const response = await axios.get(apiUrl);
    return response.data.shortenedUrl || null;
  } catch (error) {
    console.error("Error shortening URL:", error);
    return null;
  }
}

// Function to save user's API token
function saveUserToken(chatId, token) {
  const dbData = getDatabaseData();
  dbData[chatId] = token;
  fs.writeFileSync("database.json", JSON.stringify(dbData, null, 2));
}

// Function to retrieve user's API token
function getUserToken(chatId) {
  const dbData = getDatabaseData();
  return dbData[chatId];
}

// Function to read the database
function getDatabaseData() {
  try {
    return JSON.parse(fs.readFileSync("database.json", "utf8"));
  } catch (error) {
    return {};
  }
}
