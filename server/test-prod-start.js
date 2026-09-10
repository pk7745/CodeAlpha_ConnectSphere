const { spawn } = require('child_process');
const http = require('http');

async function testProdStart() {
  console.log('--- TESTING PRODUCTION START & HEALTH ENDPOINT ---');

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '5002',
    CLIENT_URL: 'http://localhost:5173',
    DATABASE_URL: 'file:./dev.db',
    JWT_SECRET: 'test_production_secret_key_with_at_least_32_characters_2026',
  };

  const proc = spawn('node', ['dist/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  let serverOutput = '';
  proc.stdout.on('data', (d) => {
    serverOutput += d.toString();
  });
  proc.stderr.on('data', (d) => {
    serverOutput += d.toString();
  });

  // Wait for server to start listening
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timed out. Output:\n${serverOutput}`));
    }, 8000);

    const checkInterval = setInterval(() => {
      if (serverOutput.includes('Running on http://0.0.0.0:5002')) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve();
      }
    }, 200);
  });

  console.log('[PASS] Server bound to 0.0.0.0:5002 in production mode');

  // Verify /api/health
  const healthData = await new Promise((resolve, reject) => {
    http.get('http://localhost:5002/api/health', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Failed to parse health response: ${data}`));
        }
      });
    }).on('error', reject);
  });

  if (healthData.status !== 200 || healthData.body.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
  }
  console.log('[PASS] GET /api/health returned 200 OK with status: "ok"');

  // Verify graceful shutdown via SIGTERM
  const exitCode = await new Promise((resolve) => {
    proc.on('close', (code) => resolve(code));
    proc.kill('SIGTERM');
  });

  if (exitCode === 0) {
    console.log('[PASS] Server gracefully stopped with exit code 0 on SIGTERM');
  } else {
    console.warn(`[WARN] Server exited with code ${exitCode} on SIGTERM`);
  }

  console.log('--- PRODUCTION START TEST PASSED SUCCESSFULLY ---');
}

testProdStart().catch((err) => {
  console.error('[FAIL] Production start test error:', err);
  process.exit(1);
});