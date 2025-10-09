#!/usr/bin/env node
/**
 * Post-install script for Graphistry MCP
 *
 * Installs Python dependencies using uv (preferred) or pip (fallback).
 * Runs after npm install to ensure Python deps are available.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function checkCommand(cmd) {
  try {
    spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function findPython() {
  const candidates = ['python3', 'python'];
  for (const cmd of candidates) {
    if (checkCommand(cmd)) {
      return cmd;
    }
  }
  return null;
}

function installWithUv(pythonCmd) {
  log('\n🚀 Installing Python dependencies with uv...', colors.cyan);

  try {
    // Check if pyproject.toml exists
    const pyprojectPath = path.join(__dirname, 'pyproject.toml');
    if (!fs.existsSync(pyprojectPath)) {
      throw new Error('pyproject.toml not found');
    }

    // Install with uv sync (creates venv and installs deps)
    execSync('uv sync --no-dev', {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      }
    });

    log('✅ Python dependencies installed with uv\n', colors.green);
    return true;
  } catch (e) {
    log(`⚠️  uv installation failed: ${e.message}`, colors.yellow);
    return false;
  }
}

function installWithPip(pythonCmd) {
  log('\n📦 Installing Python dependencies with pip...', colors.cyan);

  try {
    // Install the package in editable mode from pyproject.toml
    execSync(`${pythonCmd} -m pip install -e ".[dev]"`, {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      }
    });

    log('✅ Python dependencies installed with pip\n', colors.green);
    return true;
  } catch (e) {
    log(`❌ pip installation failed: ${e.message}`, colors.red);
    return false;
  }
}

function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  Graphistry MCP - Python Dependencies Setup', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  // Check for Python
  const pythonCmd = findPython();
  if (!pythonCmd) {
    log('❌ Python not found!', colors.red);
    log('\nPlease install Python 3.10+ from https://python.org', colors.yellow);
    log('Then run: npm install again\n', colors.yellow);
    process.exit(1);
  }

  log(`✓ Found Python: ${pythonCmd}`, colors.green);

  // Try uv first (recommended)
  const hasUv = checkCommand('uv');

  if (hasUv) {
    log('✓ Found uv (recommended package manager)', colors.green);
    if (installWithUv(pythonCmd)) {
      printSuccessMessage(true);
      return;
    }
    log('\nFalling back to pip...', colors.yellow);
  } else {
    log('ℹ uv not found - using pip instead', colors.yellow);
    log('  (Install uv for faster dependency management: https://github.com/astral-sh/uv)\n', colors.cyan);
  }

  // Fallback to pip
  if (installWithPip(pythonCmd)) {
    printSuccessMessage(false);
  } else {
    log('\n❌ Failed to install Python dependencies!\n', colors.red);
    log('Please install manually:', colors.yellow);
    log('  uv sync', colors.cyan);
    log('  OR', colors.yellow);
    log('  pip install -e ".[dev]"\n', colors.cyan);
    process.exit(1);
  }
}

function printSuccessMessage(usedUv) {
  log('\n' + '='.repeat(60), colors.bright);
  log('  ✅ Installation Complete!', colors.green);
  log('='.repeat(60) + '\n', colors.bright);

  log('Next steps:', colors.cyan);
  log('1. Get a free Graphistry account:', colors.reset);
  log('   https://hub.graphistry.com\n', colors.cyan);

  log('2. Set your Graphistry credentials:', colors.reset);
  log('   export GRAPHISTRY_USERNAME="your_username"', colors.cyan);
  log('   export GRAPHISTRY_PASSWORD="your_password"\n', colors.cyan);

  log('3. Configure in Claude Code MCP settings:', colors.reset);
  log('   {', colors.reset);
  log('     "graphistry": {', colors.reset);
  log('       "command": "npx",', colors.reset);
  log('       "args": ["-y", "@silkspace/graphistry-mcp"],', colors.reset);
  log('       "env": {', colors.reset);
  log('         "GRAPHISTRY_USERNAME": "your_username",', colors.reset);
  log('         "GRAPHISTRY_PASSWORD": "your_password"', colors.reset);
  log('       }', colors.reset);
  log('     }', colors.reset);
  log('   }\n', colors.reset);

  log('Documentation: https://github.com/graphistry/graphistry-mcp\n', colors.cyan);
}

// Run installation
main();
