# JMeter Setup Guide (Windows)

## Quick Setup (Recommended)

### Option 1: Add JMeter to PATH (Easiest)

1. **Download JMeter**
   - Go to https://jmeter.apache.org/download.cgi
   - Download "Binary" zip (e.g., `apache-jmeter-5.6.3.zip`)

2. **Extract**
   - Extract to `C:\apache-jmeter-5.6.3` (or any location)

3. **Add to PATH**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to **Advanced** tab → **Environment Variables**
   - Under **System Variables**, find `Path` → **Edit**
   - Click **New** and add: `C:\apache-jmeter-5.6.3\bin`
   - Click **OK** on all windows

4. **Verify Installation**
   - Open **new** Command Prompt or PowerShell
   - Run: `jmeter -v`
   - Should show version info

5. **Restart the Portal**
   ```bash
   npm start
   ```

### Option 2: Set JMETER_PATH Environment Variable

If you don't want to modify PATH, set a custom environment variable:

1. Download and extract JMeter as above

2. Set environment variable:
   - **Command Prompt (temporary):**
     ```cmd
     set JMETER_PATH=C:\apache-jmeter-5.6.3\bin\jmeter.bat
     npm start
     ```
   - **PowerShell (temporary):**
     ```powershell
     $env:JMETER_PATH="C:\apache-jmeter-5.6.3\bin\jmeter.bat"
     npm start
     ```
   - **Permanent:** Add `JMETER_PATH` in System Environment Variables

3. The portal will automatically use `JMETER_PATH` if set

## Troubleshooting

### Error: `'jmeter' is not recognized`

**Cause:** JMeter not in PATH

**Fix:** Follow Option 1 above to add JMeter's `bin` folder to system PATH

### Error: `Cannot find module 'fs'` or similar

**Cause:** Dependencies not installed

**Fix:**
```bash
npm install
```

### Java Error: `JAVA_HOME not set`

**Cause:** Java not installed or JAVA_HOME not configured

**Fix:**
1. Install Java JDK 11+ from https://adoptium.net/
2. Set JAVA_HOME environment variable:
   - `JAVA_HOME = C:\Program Files\Java\jdk-17`
3. Add `%JAVA_HOME%\bin` to PATH

### Port Already in Use

**Fix:** The server uses port 3000 by default. Change it:
```bash
set PORT=3001
npm start
```

Or edit `server.js` line: `const PORT = process.env.PORT || 3000;`

## Verify Installation

After setup, verify:

```bash
# Check JMeter version
jmeter -v

# Run a quick test
jmeter -n -t tests/example_test.jmx -Jthreads=1 -Jramp=1 -l /dev/null
```

If the command runs without errors, the portal will work.

## Using the Portal

1. Ensure JMeter is accessible (`jmeter -v` works in terminal)
2. Start the portal: `npm start`
3. Open http://localhost:3000
4. Green status = ready, Orange warning = needs configuration
