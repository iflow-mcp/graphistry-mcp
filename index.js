#!/usr/bin/env node
/**
 * Graphistry MCP Server
 *
 * Wrapper script that spawns the Python MCP server process.
 * Handles stdio communication between Claude Code and the Python server.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find Python executable (prefer venv, then python3, fallback to python)
function findPython() {
  // Check for venv Python first (installed by postinstall)
  const venvPaths = [
    path.join(__dirname, '.venv', 'bin', 'python'),  // Unix
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),  // Windows
  ];

  for (const venvPath of venvPaths) {
    if (fs.existsSync(venvPath)) {
      return venvPath;
    }
  }

  // Fallback to system Python
  const candidates = ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
      if (result.status === 0) {
        console.warn('Warning: Using system Python. Dependencies may not be available.');
        console.warn('If you see import errors, try running: npm install again');
        return cmd;
      }
    } catch (e) {
      // Try next candidate
    }
  }

  console.error('Error: Python not found. Please install Python 3.10+ from python.org');
  process.exit(1);
}

// Path to the Python MCP server
const serverPath = path.join(__dirname, 'run_graphistry_mcp.py');

// Verify server file exists
if (!fs.existsSync(serverPath)) {
  console.error(`Error: MCP server not found at ${serverPath}`);
  process.exit(1);
}

// Find Python
const pythonCmd = findPython();

// Spawn the Python MCP server
const pythonProcess = spawn(pythonCmd, [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1', // Disable Python output buffering
    GRAPHISTRY_VENV_ACTIVE: '1', // Prevent re-exec loop in run_graphistry_mcp.py
  }
});

// Handle process termination
pythonProcess.on('error', (err) => {
  console.error('Failed to start Python MCP server:', err.message);
  process.exit(1);
});

pythonProcess.on('exit', (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`Python MCP server exited with code ${code}`);
    process.exit(code);
  }
  if (signal) {
    console.error(`Python MCP server killed by signal ${signal}`);
    process.exit(1);
  }
});

// Forward termination signals to Python process
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => {
    pythonProcess.kill(signal);
  });
});
