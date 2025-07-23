import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.CALLBACK_PORT || process.argv[2] || 3000;

app.use(cors());
app.use(express.json());

// OAuth callback endpoint
app.get('/', (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    // If no authorization code, show server info instead of error
    return res.send(`
      <html>
        <head>
          <title>SMART FHIR OAuth Callback Server</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .info { color: #007bff; }
            .container { max-width: 500px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="info">🚀 SMART FHIR OAuth Callback Server</h2>
            <p>This server is ready to handle OAuth callbacks from EPIC.</p>
            <p><strong>Callback URL:</strong> http://localhost:${PORT}</p>
            <p><strong>Health Check:</strong> <a href="/health">http://localhost:${PORT}/health</a></p>
          </div>
        </body>
      </html>
    `);
  }

  // Send success response to browser
  res.send(`
    <html>
      <head>
        <title>Authorization Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; }
          .container { max-width: 500px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="success">✓ Authorization Successful</h2>
          <p>You have successfully connected to EPIC. You can close this window and return to the app.</p>
          <p><small>Authorization code received and being processed...</small></p>
        </div>
        <script>
          // Post message to parent window if opened in popup
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'EPIC_AUTH_SUCCESS', 
              code: '${code}', 
              state: '${state}' 
            }, '*');
            window.close();
          }
        </script>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// No default route needed - root handles OAuth callback

app.listen(PORT, () => {
  console.log(`🚀 OAuth callback server running on http://localhost:${PORT}`);
  console.log(`📋 Callback URL: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
}); 