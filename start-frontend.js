const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting CLARA Frontend...');

// Change to the correct directory
process.chdir('/Users/anishpaleja/Hack-the-6ix/CLARA-front-end');

// Start Next.js development server
const nextProcess = exec('NODE_ENV=development npx next dev -p 3003', {
  cwd: '/Users/anishpaleja/Hack-the-6ix/CLARA-front-end',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
    NEXT_PUBLIC_WS_URL: 'ws://localhost:3000/ws',
    NEXT_PUBLIC_APP_NAME: 'CLARA Health Companion'
  }
});

nextProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

nextProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
});
