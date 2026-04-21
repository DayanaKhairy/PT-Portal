# Automatic JMeter Configuration & Restart

The portal now supports saving JMeter configuration and one-click restart.

## Features Added

### 1. Persistent Configuration (`config.json`)
The JMeter path and options are saved to `config.json`:
```json
{
  "jmeterPath": "C:\\apache-jmeter-5.6.3\\bin\\jmeter.bat",
  "jmeterOptions": "-Xms512m -Xmx1024m",
  "lastUpdated": "2025-04-21T..."
}
```

### 2. Settings Modal
- Click **Settings** icon in header
- View current JMeter status and version
- Edit JMeter path and extra options
- Save configuration
- If changes detected, a **Restart Now** button appears

### 3. One-Click Restart
- After saving config changes, click **Restart Now**
- Server automatically restarts via `restart.bat`
- Page reloads after restart completes

### 4. PID File Management
- Server writes its PID to `.server.pid` on startup
- `restart.bat` uses PID to safely stop only this server
- No risk of killing other Node.js processes

## How to Use

1. **Open Settings**
   - Click the gear icon (⚙️) in the top navigation

2. **Configure JMeter Path**
   - If JMeter is in PATH: leave as `jmeter`
   - If not: enter full path, e.g. `C:\apache-jmeter-5.6.3\bin\jmeter.bat`

3. **Save**
   - Click **Save**
   - If you changed the path, a warning appears: "Restart required"
   - Click **Restart Now** button

4. **Wait for Reload**
   - The server restarts (2-3 seconds)
   - Page automatically reloads
   - Check the banner: JMeter warning should disappear

## API Endpoints

- `GET /api/config` - Retrieve current configuration
- `POST /api/config` - Save new configuration
- `POST /api/restart` - Trigger server restart

## Files Modified/Created

- `server.js` - Config loading, PID file, restart endpoint
- `index.html` - Settings modal with restart flow
- `config.json` - User configuration (created on first save)
- `restart.bat` - Windows restart script (PID-based)
- `.gitignore` - Updated to exclude `.server.pid`

## Manual Restart (Fallback)

If automatic restart fails:
```bash
# Stop server (Ctrl+C in terminal)
# Then start again:
npm start
```

## Notes

- Configuration is persisted across restarts
- Environment variables still take precedence (JMETER_PATH, JMETER_OPTIONS)
- If `restart.bat` is missing, server logs instructions for manual restart
- PID file is cleaned up on restart
