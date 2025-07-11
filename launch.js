const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting MoveMate...');

const movematePath = path.join(__dirname, 'movemate');

// Check if .env exists
const envPath = path.join(movematePath, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env file!');
  console.log('Please copy .env.example to .env and configure your Supabase credentials');
  process.exit(1);
}

// Check and install dependencies
const nodeModulesPath = path.join(movematePath, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('Installing dependencies...');
  const install = spawn('npm', ['install'], { 
    cwd: movematePath, 
    stdio: 'inherit' 
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('Dependencies installed successfully!');
      startApp();
    } else {
      console.error('Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  console.log('Dependencies already installed');
  startApp();
}

function startApp() {
  console.log('Starting development server...');
  console.log('Your app will open at: http://localhost:3000');
  console.log('Press Ctrl+C to stop the server');
  
  const start = spawn('npm', ['start'], { 
    cwd: movematePath, 
    stdio: 'inherit' 
  });
  
  start.on('close', (code) => {
    console.log(`\nServer stopped with code ${code}`);
  });
}
