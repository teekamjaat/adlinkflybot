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

// Retrieve the Telegram bot token from the environment variable
const botToken = process.env.TELEGRAM_BOT_TOKEN;

// Create the Telegram bot instance
const bot = new TelegramBot(botToken, { polling: true });

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const welcomeMessage = `*Hello, ${username}!*\\n\\n`
    + `*Welcome to the IndiaEarnX URL Shortener Bot!*\\n`
    + `*You can use this bot to shorten URLs using the indiaearnx\\.com API service*\\n\\n`
    + `*To shorten a URL, just type or paste the URL directly in the chat, and the bot will provide you with the shortened URL\\.*\\n\\n`
    + `*If you haven't set your IndiaEarnX API token yet, use the command:*\\n`
    + '`/setapi YOUR_IndiaEarnx_API_TOKEN`\\n\\n'
    + `*Example:* \`/setapi c49399f821fc020161bc2a31475ec59f35ae5b4\``;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'MarkdownV2' });
});

// Command: /setapi
bot.onText(/\/setapi (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userToken = match[1].trim(); // Get the API token provided by the user

  // Save the user's API token to the database
  saveUserToken(chatId, userToken);

  const response = `*IndiaEarnX API token set successfully\\.*\\n\\n*Your token:* \`${userToken}\``;
  bot.sendMessage(chatId, response, { parse_mode: 'MarkdownV2' });
});

// Listen for any message (not just commands)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // If the message starts with "http://" or "https://", assume it's a URL and try to shorten it
  if (messageText && (messageText.startsWith('http://') || messageText.startsWith('https://'))) {
    shortenUrlAndSend(chatId, messageText);
  }
});

// Function to shorten the URL and send the result
async function shortenUrlAndSend(chatId, Url) {
  // Retrieve the user's API token from the database
  const arklinksToken = getUserToken(chatId);

  if (!arklinksToken) {
    bot.sendMessage(chatId, '*Please provide your IndiaEarnX API token first\\.*\\nUse the command: `/setapi YOUR_IndiaEarnX_API_TOKEN`', { parse_mode: 'MarkdownV2' });
    return;
  }

  try {
    const apiUrl = `https://indiaearnx.com/api?api=${arklinksToken}&url=${Url}`;

    // Make a request to the IndiaEarnX API to shorten the URL
    const response = await axios.get(apiUrl);
    const shortUrl = response.data.shortenedUrl;

    const responseMessage = `✅ *Shortened URL:* [${shortUrl}](${shortUrl})`;
    bot.sendMessage(chatId, responseMessage, { parse_mode: 'MarkdownV2', disable_web_page_preview: true });
  } catch (error) {
    console.error('Shorten URL Error:', error);
    bot.sendMessage(chatId, '⚠️ *An error occurred while shortening the URL\\.* Please check your API token and try again\\.', { parse_mode: 'MarkdownV2' });
  }
}

// Function to validate the URL format
function isValidUrl(url) {
  const urlPattern = /^(|ftp|http|https):\/\/[^ "]+$/;
  return urlPattern.test(url);
}

// Function to save user's API token to the database (JSON file)
function saveUserToken(chatId, token) {
  const dbData = getDatabaseData();
  dbData[chatId] = token;
  fs.writeFileSync('database.json', JSON.stringify(dbData, null, 2));
}

// Function to retrieve user's API token from the database
function getUserToken(chatId) {
  const dbData = getDatabaseData();
  return dbData[chatId];
}

// Function to read the database file and parse the JSON data
function getDatabaseData() {
  try {
    return JSON.parse(fs.readFileSync('database.json', 'utf8'));
  } catch (error) {
    // Return an empty object if the file doesn't exist or couldn't be parsed
    return {};
  }
}
