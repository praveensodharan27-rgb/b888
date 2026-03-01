#!/usr/bin/env node

/**
 * Smart Backend Server Starter
 * Automatically kills any process using port 5000 before starting
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PORT = process.env.PORT || 5000;

async function findProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          pids.add(match[1]);
        }
      }
      
      return Array.from(pids);
    } else {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    }
  } catch (error) {
    return [];
  }
}

async function killProcess(pid) {
  try {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🔍 Checking for existing backend process on port', PORT, '...\n');
  
  const pids = await findProcessOnPort(PORT);
  
  if (pids.length > 0) {
    console.log('⚠️  Found existing process(es) using port', PORT);
    console.log('📋 PIDs:', pids.join(', '));
    console.log('🔪 Killing process(es)...\n');
    
    for (const pid of pids) {
      const killed = await killProcess(pid);
      if (killed) {
        console.log(`✅ Killed process ${pid}`);
      } else {
        console.log(`❌ Failed to kill process ${pid}`);
      }
    }
    
    // Wait a moment for ports to be released
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
  } else {
    console.log('✅ Port', PORT, 'is available\n');
  }
  
  console.log('🚀 Starting backend server...');
  console.log('📍 Backend will run on: http://localhost:' + PORT);
  console.log('📍 Frontend should run on: http://localhost:3000\n');
  
  // Start the server
  require('./src/server.js');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
