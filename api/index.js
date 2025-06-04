const app = require('../src/app');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle the request
  return new Promise((resolve, reject) => {
    const responseComplete = () => resolve(null);
    const { method, url, headers } = req;
    
    // Create mock request/response objects
    const request = {
      ...req,
      method,
      url,
      headers,
      connection: { encrypted: req.connection.encrypted },
    };

    const response = {
      ...res,
      statusCode: 200,
      end: (chunk, encoding) => {
        if (chunk) res.end(chunk, encoding);
        else res.end();
        responseComplete();
      },
      setHeader: (name, value) => res.setHeader(name, value),
      writeHead: (statusCode, statusMessage, headers) => {
        res.statusCode = statusCode;
        if (statusMessage) res.statusMessage = statusMessage;
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
      },
    };

    // Handle errors
    response.on('error', reject);
    
    // Process the request
    app(request, response, () => {
      if (!response.writableEnded) {
        response.end();
      }
    });
  });
};
