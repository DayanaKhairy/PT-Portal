# Performance Testing Portal

A modern web-based interface for running Apache JMeter tests with project organization, file uploads, and real-time output.

## Features

- **Project-based organization**: Create projects to organize test suites
- **File upload**: Drag & drop or click to upload `.jmx` files to projects
- **Modern dark UI**: Clean, responsive interface with gradient accents
- **File browser**: Navigate directories and select JMX files within projects
- **Configurable parameters**: Threads, ramp-up time, extra JMeter arguments
- **Real-time output**: View test execution logs as they happen
- **Statistics dashboard**: Track test runs and performance metrics
- **Project management**: Create, view, and delete projects

## Prerequisites

### Required: Apache JMeter

The portal requires JMeter to run tests. You must install and configure it:

#### Windows Setup (Quick)

1. **Download JMeter**
   - https://jmeter.apache.org/download.cgi
   - Download "Binary" zip (e.g., `apache-jmeter-5.6.3.zip`)

2. **Extract**
   ```
   Extract to: C:\apache-jmeter-5.6.3\
   ```

3. **Add to System PATH**
   - Press `Win + R` → type `sysdm.cpl` → Enter
   - Advanced tab → Environment Variables
   - Edit `Path` → New: `C:\apache-jmeter-5.6.3\bin`
   - OK all dialogs

4. **Verify**
   ```cmd
   jmeter -v
   ```
   Should print version info.

5. **Restart terminal** and run:
   ```bash
   npm start
   ```

#### Alternative: Use JMETER_PATH

Instead of adding to PATH, set an environment variable:

**Windows CMD:**
```cmd
set JMETER_PATH=C:\apache-jmeter-5.6.3\bin\jmeter.bat
npm start
```

**PowerShell:**
```powershell
$env:JMETER_PATH="C:\apache-jmeter-5.6.3\bin\jmeter.bat"
npm start
```

**Permanent:** Add `JMETER_PATH` system variable through Environment Variables settings.

### Java Requirement

JMeter requires Java 11+ installed. Download from https://adoptium.net/

### Node.js

- Node.js v14+ required

## Installation

```bash
cd PT-Portal
npm install
```

## Usage

Start the server:

```bash
npm start
```

The portal runs at: **http://localhost:3000**

Configure JMeter path via Settings icon in the nav bar if needed.

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `JMETER_PATH` - Path to JMeter executable (default: `jmeter`)
- `JMETER_OPTIONS` - Additional JMeter CLI options

### Settings UI

Click the **Settings** icon in the header to:
- View current JMeter configuration
- See if JMeter is detected
- Configure custom JMeter path

## How It Works

1. **Projects view**: See all projects (directories with JMX files)
2. **Create project**: Click "New Project" to create a workspace
3. **Upload tests**: Drag & drop `.jmx` files or use the upload area
4. **Select project**: Click a project card to open its test runner
5. **Choose test**: Browse and select a JMX file from the sidebar
6. **Configure**: Set thread count, ramp-up time, and any extra JMeter arguments
7. **Run**: Click "Run Test" and watch real-time output

## API Endpoints

- `GET /` - Portal landing page
- `GET /health` - Check server & JMeter status
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project `{ name, description }`
- `DELETE /api/projects/:projectId` - Delete a project
- `POST /api/projects/:projectId/upload` - Upload JMX file (multipart/form-data)
- `DELETE /api/projects/:projectId/tests/:filename` - Delete test file
- `GET /api/stats` - Overall statistics
- `GET /list-jmx?dir=<path>` - List JMX files in directory
- `POST /run-jmeter` - Execute a JMeter test
- `GET /health` - Health check

## Data Structure

```
projects/          # User-created projects (created at runtime)
├── my-project-1/
│   ├── login_test.jmx
│   └── api_load.jmx
└── my-project-2/
    └── stress_test.jmx

tests/            # Sample tests included (reference only)
├── example_test.jmx
├── rest-api/
│   └── api_load_test.jmx
└── load-stress/
    └── stress_test.jmx
```

## Notes

- JMX paths are relative to the server root
- Extra arguments are appended to the JMeter command line
- Upload accepts `.jmx` files only
- Output buffer limited to 10MB per test
- Statistics are placeholders (can be connected to actual results)
- The `tests/` directory is pre-populated with example tests

## Common Issues

### 'jmeter' is not recognized

**Solution:** Add JMeter's `bin` folder to your system PATH or set `JMETER_PATH` environment variable. See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

### Port 3000 already in use

**Solution:** Set a different port:
```bash
set PORT=3001
npm start
```

### File upload fails

**Solution:** Ensure the project directory exists and is writable. The portal creates projects in the `projects/` directory.

### JMeter runs but output is empty

**Solution:** The test may complete too fast. Add `-l results.jtl` to Extra Arguments to save results to a file, or add more loops in your JMX test plan.

## License

MIT
