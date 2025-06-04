const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

// Initialize WhatsApp client with in-memory session
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'whatsapp-client',
    dataPath: '/tmp/.wwebjs_auth'  // Use /tmp for serverless
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

let qrCode = null;
let isReady = false;

// Handle QR code generation
client.on('qr', (qr) => {
  console.log('QR Code received');
  qrCode = qr;
  qrcode.generate(qr, { small: true });
});

// Handle client ready
client.on('ready', () => {
  console.log('Client is ready!');
  isReady = true;
});

// Initialize client
client.initialize().catch(console.error);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: isReady ? 'connected' : 'disconnected',
    qrCode: !isReady && qrCode ? qrCode : null
  });
});

// Send message endpoint
app.post('/send-message', async (req, res) => {
  if (!isReady) {
    return res.status(400).json({ error: 'WhatsApp client is not ready' });
  }

  const { number, message } = req.body;
  
  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }

  try {
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the serverless function
module.exports = app;
