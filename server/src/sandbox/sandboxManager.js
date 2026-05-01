const axios = require('axios');
const fs = require('fs/promises');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const env = require('../config/env');

const SANDBOX_ROOT = path.resolve(__dirname, '../../.forgeapi-sandboxes');
const BOOT_TIMEOUT_MS = 10000;

class SandboxManager {
  constructor() {
    this.apiKey = env.SANDBOX_API_KEY;
    this.apiUrl = 'https://api.e2b.dev/v1/sandboxes';
    this.processes = new Map();
  }

  async getFreePort() {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, () => {
        const address = server.address();
        server.close(() => resolve(address.port));
      });
    });
  }

  getRuntime(files = {}) {
    const packageJson = files['package.json'];

    if (packageJson) {
      try {
        const parsed = JSON.parse(packageJson);
        if (parsed.main && files[parsed.main]) {
          return { command: process.execPath, args: [parsed.main] };
        }
      } catch {
        // Fall back to common entry names.
      }
    }

    const nodeEntry = ['server.js', 'index.js', 'app.js', 'src/server.js', 'src/index.js', 'src/app.js'].find(
      (candidate) => files[candidate],
    );

    if (nodeEntry) {
      return { command: process.execPath, args: [nodeEntry] };
    }

    const pythonEntry = ['main.py', 'app.py', 'src/main.py', 'src/app.py'].find(
      (candidate) => files[candidate],
    );

    if (pythonEntry) {
      const moduleName = pythonEntry.replace(/\.py$/, '').replace(/[\\/]/g, '.');
      return { command: 'python', args: ['-m', 'uvicorn', `${moduleName}:app`, '--host', '127.0.0.1'] };
    }

    return null;
  }

  async writeFiles(apiId, currentCode) {
    const targetDir = path.resolve(SANDBOX_ROOT, apiId);

    if (!targetDir.startsWith(SANDBOX_ROOT)) {
      throw new Error('Resolved sandbox path escaped sandbox root');
    }

    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    for (const [filepath, content] of Object.entries(currentCode || {})) {
      const resolvedPath = path.resolve(targetDir, filepath);

      if (!resolvedPath.startsWith(targetDir)) {
        throw new Error(`Unsafe generated filepath rejected: ${filepath}`);
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, String(content), 'utf8');
    }

    return targetDir;
  }

  async waitForBoot(baseUrl, child, getSpawnError) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < BOOT_TIMEOUT_MS) {
      const spawnError = getSpawnError();
      if (spawnError) {
        throw spawnError;
      }

      if (child.exitCode != null) {
        throw new Error(`Sandbox process exited with code ${child.exitCode}`);
      }

      try {
        await axios.get(baseUrl, { timeout: 800, validateStatus: () => true });
        return;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    throw new Error(`Sandbox did not respond before timeout: ${lastError?.message || 'unknown error'}`);
  }

  async deploy(apiId, currentCode) {
    await this.stop(apiId);

    if (!currentCode || Object.keys(currentCode).length === 0) {
      throw new Error('No generated files available for sandbox deployment');
    }

    if (this.apiKey && this.apiKey !== 'your_sandbox_api_key_here') {
      // Cloud sandbox integration belongs here. Local runtime remains the development fallback.
    }

    const runtime = this.getRuntime(currentCode);

    if (!runtime) {
      throw new Error('No runnable Node or FastAPI entry file found in generated code');
    }

    const sandboxDir = await this.writeFiles(apiId, currentCode);
    const port = await this.getFreePort();
    const child = spawn(runtime.command, [...runtime.args, '--port', String(port)], {
      cwd: sandboxDir,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        NODE_PATH: path.resolve(__dirname, '../../node_modules'),
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    let spawnError = null;
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (err) => {
      spawnError = err;
    });

    child.once('exit', () => {
      if (this.processes.get(apiId)?.child === child) {
        this.processes.delete(apiId);
      }
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    this.processes.set(apiId, { child, port, sandboxDir });

    try {
      await this.waitForBoot(baseUrl, child, () => spawnError);
      console.log(`[Sandbox] API ${apiId} is live at ${baseUrl}`);
      return baseUrl;
    } catch (err) {
      await this.stop(apiId);
      throw new Error(`Sandbox Deployment Failed: ${err.message}${stderr ? `\n${stderr}` : ''}`);
    }
  }

  async stop(apiId) {
    const existing = this.processes.get(apiId);

    if (!existing) {
      return true;
    }

    existing.child.kill('SIGTERM');
    this.processes.delete(apiId);
    return true;
  }
}

module.exports = new SandboxManager();
