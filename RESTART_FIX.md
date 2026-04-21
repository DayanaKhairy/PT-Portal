# Restart Button Fix & JMeter Path Resolution

## Issues Fixed

### 1. **Restart Button Not Working**
- Fixed function name: `restartServer()` → `attemptRestart()`
- Created `restart.js` - robust cross-platform restart script
- Uses PID file to safely kill old process
- Spawns new `npm start` detached process

### 2. **JMeter Path Handling**
- Server now automatically detects if path is a directory
- If you select a folder (e.g., `C:\apache-jmeter\bin`), it automatically appends `jmeter.bat`
- Paths with spaces are now properly quoted in the command

### 3. **Better Error Messages**
- Shows the exact JMeter path being used
- Health check logs to console
- Clear instructions if JMeter not found

---

## Current Status

Your `config.json` currently has:
```json
{
  "jmeterPath": "C:\\PT Test\\apache-jmeter-5.6.2\\apache-jmeter-5.6.2\\bin",
  "jmeterOptions": "",
  "lastUpdated": "..."
}
```

This is a **directory**. The server will automatically convert it to:
```
C:\PT Test\apache-jmeter-5.6.2\apache-jmeter-5.6.2\bin\jmeter.bat
```

**That should work** if `jmeter.bat` exists in that folder.

---

## How to Use Now

### Step 1: Restart the Server (Manually First Time)

In your terminal (where `npm start` is running):
- Press `Ctrl+C` to stop
- Run: `npm start`

OR use the restart button in the Settings modal (should work now).

### Step 2: Check Server Logs

Look for lines:
```
[Config] JMeter path: C:\PT Test\apache-jmeter-5.6.2\apache-jmeter-5.6.2\bin\jmeter.bat
[Health] Checking JMeter at: ...
[Health] JMeter available: true [Apache JMeter 5.6.2]
```

If you see `jmeter available: true`, you're good!

### Step 3: Test in Portal

1. Open http://localhost:3000
2. Click a project
3. Select a JMX file
4. Click **Run Test**

---

## If Restart Button Still Fails

The automatic restart may be blocked by Windows security. If clicking "Restart Now" does nothing:

**Manual restart:**
```bash
# In the terminal
Ctrl+C
npm start
```

Then refresh the page.

---

## Files Changed

| File | Change |
|------|--------|
| `server.js` | Fixed JMeter path resolution (auto-append .bat for directories), quoted paths with spaces |
| `restart.js` | Fixed duplicate function, cleaner logic |
| `index.html` | `attemptRestart()` function, better error handling |

---

## Need to Adjust JMeter Path?

If your JMeter is actually at a different location:

1. Click **Settings (⚙️)**
2. Enter the **full path** to `jmeter.bat`, for example:
   ```
   C:\Tools\apache-jmeter-5.6.2\bin\jmeter.bat
   ```
3. Click **Save**
4. Click **Restart Now**
5. Wait for page to reload

---

**The restart button should work now. If not, use manual Ctrl+C / npm start.**
