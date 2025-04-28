const { exec } = require('child_process');
const port = 5002;

const isWindows = process.platform === 'win32';

const command = isWindows
  ? `netstat -ano | findstr :${port}`
  : `lsof -i :${port} | grep LISTEN | awk '{print $2}'`;

exec(command, (error, stdout) => {
  if (error) {
    console.log(`No process found using port ${port}`);
    return;
  }

  const pid = isWindows
    ? stdout.split('\n')[0].split(' ').filter(Boolean).pop()
    : stdout.trim();

  if (pid) {
    const killCommand = isWindows
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    exec(killCommand, (err) => {
      if (err) {
        console.error(`Failed to kill process on port ${port}:`, err);
      } else {
        console.log(`Successfully killed process on port ${port}`);
      }
    });
  }
}); 