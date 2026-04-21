const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Performance Testing Portal - Restarting ===');

const pidFile = path.join(__dirname, '.server.pid');

// Function to start the server
function startServer() {
  console.log('Starting server with: npm start');
  
  const child = spawn('npm', ['start'], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  
  child.unref();
  console.log('Server started (PID will be written to .server.pid)');
  process.exit(0);
}

// Try to kill existing process
if (fs.existsSync(pidFile)) {
  const pid = fs.readFileSync(pidFile, 'utf8').trim();
  console.log(`Attempting to stop process ${pid}...`);
  
  const kill = spawn('taskkill', ['/F', '/PID', pid], {
    stdio: 'inherit',
    shell: true
  });
  
  kill.on('close', (code) => {
    if (code === 0) {
      console.log('Process stopped successfully.');
      try { fs.unlinkSync(pidFile); } catch (e) {}
    } else {
      console.log(`Process may already be stopped (exit code: ${code})`);
      try { fs.unlinkSync(pidFile); } catch (e) {}
    }
    setTimeout(startServer, 2000);
  });
  
  kill.on('error', (err) => {
    console.error('Failed to kill process:', err.message);
    console.log('Attempting to start server anyway...');
    startServer();
  });
  
} else {
  console.log('No PID file found - starting fresh server');
  startServer();
}
