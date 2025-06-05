const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const app = express();

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Initialize WhatsApp client with in-memory session
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'whatsapp-client',
    dataPath: '/tmp/.wwebjs_auth'  // Use /tmp for serverless
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_BIN || null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--disable-extensions',
      '--disable-setuid-sandbox',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--safebrowsing-disable-auto-update'
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
let isInitializing = false;

const initializeClient = async () => {
  if (isInitializing) return;
  isInitializing = true;
  
  try {
    await client.initialize();
  } catch (error) {
    console.error('Error initializing client:', error);
    // Try to reinitialize after 5 seconds
    setTimeout(initializeClient, 5000);
  } finally {
    isInitializing = false;
  }
};

// Start initialization
initializeClient();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: isReady ? 'connected' : 'disconnected',
    qrCode: !isReady && qrCode ? qrCode : null,
    timestamp: new Date().toISOString()
  });
});

// QR code endpoint
app.get('/qr', (req, res) => {
  if (qrCode) {
    qrcode.generate(qrCode, { small: true });
    res.send(`<pre>${qrCode}</pre>`);
  } else {
    res.status(404).json({ error: 'QR code not available yet' });
  }
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
