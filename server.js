const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Track running test process
let currentTestProcess = null;
let testStartTime = null;

// Configuration management
const CONFIG_PATH = path.join(__dirname, 'config.json');
const pidFile = path.join(__dirname, '.server.pid');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return { jmeterPath: '', jmeterOptions: '' };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save config:', err);
    return false;
  }
}

// Load configuration (can be overridden by environment variables)
const config = loadConfig();
let JMETER_PATH = process.env.JMETER_PATH || config.jmeterPath || 
                  (process.platform === 'win32' ? 'jmeter' : 'jmeter');
                  // Auto-detect local JMeter if not found (for Render deployment)
if (!fs.existsSync(JMETER_PATH)) {
  try {
    const files = fs.readdirSync(__dirname);
    const jmeterDir = files.find(f => 
      f.startsWith('apache-jmeter-') && 
      fs.statSync(path.join(__dirname, f)).isDirectory()
    );

    if (jmeterDir) {
      const exeName = process.platform === 'win32' ? 'jmeter.bat' : 'jmeter';
      JMETER_PATH = path.join(__dirname, jmeterDir, 'bin', exeName);
      console.log(`[Config] Auto-detected local JMeter: ${JMETER_PATH}`);
    }
  } catch (e) {
    // No local JMeter found
  }
}
const JMETER_OPTIONS = process.env.JMETER_OPTIONS || config.jmeterOptions || '';

// Normalize JMeter path: if it's a directory, append jmeter.bat (Windows) or jmeter (Unix)
if (JMETER_PATH && JMETER_PATH !== 'jmeter') {
  try {
    const stats = fs.statSync(JMETER_PATH);
    if (stats.isDirectory()) {
      const exeName = process.platform === 'win32' ? 'jmeter.bat' : 'jmeter';
      JMETER_PATH = path.join(JMETER_PATH, exeName);
      console.log(`[Config] JMeter path is a directory, adjusted to: ${JMETER_PATH}`);
    }
  } catch (e) {
    // Path doesn't exist locally yet, keep as-is (might be valid after install)
  }
}

console.log(`[Config] JMeter path: ${JMETER_PATH}`);
console.log(`[Config] JMeter options: ${JMETER_OPTIONS || '(none)'}`);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { projectId } = req.params;
    const projectPath = path.join(__dirname, 'projects', projectId);
    fs.mkdirSync(projectPath, { recursive: true });
    cb(null, projectPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.jmx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .jmx files are allowed'));
    }
  }
});

/* -----------------------------
   Get configuration
-----------------------------*/
app.get("/api/config", (req, res) => {
  const cfg = loadConfig();
  res.json({
    ...cfg,
    envJMETER_PATH: process.env.JMETER_PATH || null,
    envJMETER_OPTIONS: process.env.JMETER_OPTIONS || null,
    effectiveJMETER_PATH: JMETER_PATH,
    effectiveJMETER_OPTIONS: JMETER_OPTIONS
  });
});

/* -----------------------------
   Update configuration
-----------------------------*/
app.post("/api/config", (req, res) => {
  const { jmeterPath, jmeterOptions } = req.body;

  const currentConfig = loadConfig();
  
  if (jmeterPath !== undefined) currentConfig.jmeterPath = jmeterPath;
  if (jmeterOptions !== undefined) currentConfig.jmeterOptions = jmeterOptions;
  currentConfig.lastUpdated = new Date().toISOString();

  if (saveConfig(currentConfig)) {
    res.json({
      success: true,
      message: "Configuration saved. Restart server to apply changes.",
      config: currentConfig
    });
  } else {
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

/* -----------------------------
   Stop running JMeter test
-----------------------------*/
app.post("/stop-jmeter", (req, res) => {
  if (!currentTestProcess) {
    return res.json({ success: false, message: "No test is currently running" });
  }

  console.log('[JMeter] Stopping test (PID: ' + currentTestProcess.pid + ')');
  
  try {
    // Send SIGTERM to gracefully stop
    currentTestProcess.kill('SIGTERM');
    
    // On Windows, taskkill might be needed
    if (process.platform === 'win32') {
      const { spawn } = require('child_process');
      const killProc = spawn('taskkill', ['/PID', currentTestProcess.pid.toString(), '/F'], {
        stdio: 'ignore',
        shell: true
      });
      killProc.on('close', () => {
        console.log('[JMeter] Process killed');
      });
    }
    
    res.json({ success: true, message: "Test stopped" });
  } catch (err) {
    console.error('[JMeter] Error stopping test:', err);
    res.status(500).json({ error: "Failed to stop test: " + err.message });
  }
});

/* -----------------------------
   Get test status
-----------------------------*/
app.get("/test-status", (req, res) => {
  if (currentTestProcess) {
    const uptime = testStartTime ? Date.now() - testStartTime : 0;
    res.json({
      running: true,
      pid: currentTestProcess.pid,
      uptime: uptime,
      startTime: testStartTime ? new Date(testStartTime).toISOString() : null
    });
  } else {
    res.json({ running: false });
  }
});

/* -----------------------------
   Health check - also verifies JMeter
-----------------------------*/
app.get("/health", (req, res) => {
  console.log(`[Health] Checking JMeter at: ${JMETER_PATH}`);
  
  const checkCommand = `${JMETER_PATH} -v`;
  
  exec(checkCommand, { maxBuffer: 1024 * 100 }, (error, stdout, stderr) => {
    const jmeterAvailable = !error;
    const version = jmeterAvailable ? (stdout || stderr || 'Unknown').split('\n')[0].trim() : null;
    
    console.log(`[Health] JMeter available: ${jmeterAvailable}`, version ? `[${version}]` : '');
    
    res.json({ 
      status: jmeterAvailable ? "ok" : "jmeter_missing",
      jmeterPath: JMETER_PATH,
      jmeterAvailable,
      timestamp: new Date().toISOString(),
      version,
      platform: process.platform
    });
  });
});

/* -----------------------------
   List JMX files
-----------------------------*/
app.get("/list-jmx", (req, res) => {
  const dir = req.query.dir || ".";
  const fullDir = path.resolve(__dirname, dir);

  if (!fs.existsSync(fullDir)) {
    return res.status(404).json({ error: "Directory not found" });
  }

  try {
    const files = fs.readdirSync(fullDir)
      .filter(f => f.endsWith(".jmx"))
      .map(f => ({
        name: f,
        path: path.join(dir, f).replace(/\\/g, "/"),
        size: fs.statSync(path.join(fullDir, f)).size
      }));

    res.json({ files, dir });
  } catch (err) {
    res.status(500).json({ error: "Failed to read directory" });
  }
});

/* -----------------------------
   Run JMeter test
-----------------------------*/
app.post("/run-jmeter", (req, res) => {
  // If a test is already running, stop it first
  if (currentTestProcess) {
    console.log('[JMeter] Stopping previous test...');
    try {
      currentTestProcess.kill('SIGTERM');
    } catch (e) {}
    currentTestProcess = null;
  }

  const { jmxPath, threads, ramp, extraArgs } = req.body;

  if (!jmxPath) {
    return res.status(400).send("Missing JMX path");
  }

  const fullPath = path.resolve(__dirname, jmxPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send(`JMX file not found: ${fullPath}`);
  }

  const args = [
    "-n",
    "-t", `"${fullPath}"`,
    `-Jthreads=${threads || 1}`,
    `-Jramp=${ramp || 1}`
  ];

  if (extraArgs && Array.isArray(extraArgs)) {
    args.push(...extraArgs);
  }

  const command = `"${JMETER_PATH}" ${JMETER_OPTIONS} ${args.join(" ")}`;
  console.log("Executing:", command);

  // Start the process
  const child = exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    // Test completed (or errored)
    if (currentTestProcess === child) {
      currentTestProcess = null;
      testStartTime = null;
      console.log('[JMeter] Test finished');
    }
    
    if (error) {
      const errorMsg = error.message;
      // If test was killed by stop button
      if (error.killed || errorMsg.includes('killed') || error.code === 1 && errorMsg.includes('terminated')) {
        return res.send(`TEST STOPPED BY USER\n\n${stdout || ''}`);
      }
      if (error.code === 1 || errorMsg.includes('not recognized') || errorMsg.includes('not found')) {
        return res.send(
          `ERROR: JMeter not found or not in PATH\n\n` +
          `Current JMETER_PATH: "${JMETER_PATH}"\n\n` +
          `Fix:\n` +
          `1. Download JMeter from https://jmeter.apache.org/download.cgi\n` +
          `2. Extract and add bin folder to PATH\n` +
          `   OR set full path in Settings (e.g., C:\\apache-jmeter-5.6.3\\bin\\jmeter.bat)\n` +
          `3. Restart server\n`
        );
      }
      return res.send(`ERROR:\n${errorMsg}`);
    }
    if (stderr) {
      return res.send(`STDERR:\n${stderr}`);
    }
    res.send(stdout);
  });

  // Track the process
  currentTestProcess = child;
  testStartTime = Date.now();
  
  console.log(`[JMeter] Test started (PID: ${child.pid})`);

  // IMPORTANT: Do NOT send response here. Wait for exec callback.
});

/* -----------------------------
   Health check
-----------------------------*/
app.get("/health", (req, res) => {
  const checkCommand = `${JMETER_PATH} -v`;
  
  exec(checkCommand, { maxBuffer: 1024 * 100 }, (error, stdout, stderr) => {
    const jmeterAvailable = !error;
    res.json({ 
      status: jmeterAvailable ? "ok" : "jmeter_missing",
      jmeterPath: JMETER_PATH,
      jmeterAvailable,
      timestamp: new Date().toISOString(),
      version: jmeterAvailable ? (stdout || stderr || 'Unknown').split('\n')[0].trim() : null,
      platform: process.platform
    });
  });
});

/* -----------------------------
   API: Projects
-----------------------------*/
app.get("/api/projects", (req, res) => {
  const projects = [];
  const projectsDir = path.join(__dirname, 'projects');

  try {
    if (fs.existsSync(projectsDir)) {
      const dirs = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      dirs.forEach(dirName => {
        const dirPath = path.join(projectsDir, dirName);
        const files = fs.readdirSync(dirPath);
        const jmxFiles = files.filter(f => f.endsWith('.jmx'));

        projects.push({
          id: dirName,
          name: dirName,
          description: `${jmxFiles.length} test${jmxFiles.length > 1 ? 's' : ''}`,
          path: path.join('projects', dirName),
          tests: jmxFiles,
          lastRun: 'Never',
          icon: 'folder',
        });
      });
    }

    const testsDir = path.join(__dirname, 'tests');
    if (fs.existsSync(testsDir)) {
      const rootFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.jmx'));
      if (rootFiles.length > 0) {
        projects.unshift({
          id: 'tests',
          name: 'Test Suite',
          description: `${rootFiles.length} test${rootFiles.length > 1 ? 's' : ''}`,
          path: 'tests',
          tests: rootFiles,
          lastRun: 'Never',
          icon: 'flask',
        });
      }
    }
  } catch (err) {
    console.error('Error scanning projects:', err);
  }

  res.json(projects);
});

app.post("/api/projects", (req, res) => {
  const { name } = req.body;
  if (!name || !/^[a-zA-Z0-9-_ ]+$/.test(name)) {
    return res.status(400).json({ error: "Invalid project name" });
  }

  const projectPath = path.join(__dirname, 'projects', name);
  try {
    fs.mkdirSync(projectPath, { recursive: true });
    res.json({
      id: name,
      name,
      description: 'New project',
      path: path.join('projects', name),
      tests: [],
      lastRun: 'Never',
      icon: 'folder',
    });
  } catch (err) {
    if (err.code === 'EEXIST') {
      return res.status(409).json({ error: "Project already exists" });
    }
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.post("/api/projects/:projectId/upload", upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    success: true,
    file: req.file.filename,
    size: req.file.size,
    message: "File uploaded"
  });
});

app.delete("/api/projects/:projectId", (req, res) => {
  const { projectId } = req.params;
  if (projectId === 'tests') {
    return res.status(403).json({ error: "Cannot delete test suite" });
  }
  const projectPath = path.join(__dirname, 'projects', projectId);
  try {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.delete("/api/projects/:projectId/tests/:filename", (req, res) => {
  const { projectId, filename } = req.params;
  const filePath = path.join(__dirname, 'projects', projectId, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.get("/api/stats", (req, res) => {
  res.json({
    totalRuns: 0,
    avgResponse: 0,
    successRate: 100,
    totalTests: 0,
    totalProjects: 0,
  });
});

/* -----------------------------
   Get system stats
-----------------------------*/
app.get("/api/stats", (req, res) => {
  res.json({
    totalRuns: 0,
    avgResponse: 0,
    successRate: 100,
    totalTests: 0,
    totalProjects: 0,
  });
});

/* -----------------------------
   Start server
-----------------------------*/
const PORT = process.env.PORT || 3000;

// Write PID file
try {
  fs.writeFileSync(pidFile, process.pid.toString());
} catch (err) {
  console.warn('Could not write PID file:', err.message);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
