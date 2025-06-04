// This is a Vercel Serverless Function
const { createServer } = require('http');
const { parse } = require('url');
const app = require('../src/app');

// Create HTTP server
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  app(req, res, () => {});
});

// Export the serverless function
module.exports = (req, res) => {
  return app(req, res);
};
