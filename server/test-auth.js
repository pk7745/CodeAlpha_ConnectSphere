const http = require('http');
const { app, server } = require('./dist/server.js');
const { prisma } = require('./dist/lib/prisma.js');

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(resData);
          } catch {
            parsed = resData;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AUTHENTICATION VERIFICATION SUITE ---');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail}`);
    }
  }

  try {
    // Clean up test user if exists
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Alex Mercer';

    // 1. Successful registration
    const regRes = await request('POST', '/api/auth/register', {
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    assert(
      regRes.status === 201 &&
        regRes.body.user &&
        regRes.body.user.email === testEmail &&
        regRes.body.token &&
        regRes.body.user.passwordHash === undefined,
      '1. Successful registration (201, user, token, no passwordHash)'
    );

    const authToken = regRes.body.token;
    const userId = regRes.body.user.id;

    // 2. Duplicate email rejection
    const dupRes = await request('POST', '/api/auth/register', {
      name: 'Duplicate Alex',
      email: testEmail,
      password: 'AnotherPassword123',
    });
    assert(
      dupRes.status === 409 && dupRes.body.error === 'Conflict',
      '2. Duplicate email rejection (409 Conflict)'
    );

    // 3. Invalid registration input (short password, invalid email)
    const invalidReg = await request('POST', '/api/auth/register', {
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });
    assert(
      invalidReg.status === 400 && invalidReg.body.error === 'Validation Error',
      '3. Invalid registration input validation (400 Validation Error)'
    );

    // 4. Password hashing verification in DB
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    assert(
      dbUser &&
        dbUser.passwordHash !== testPassword &&
        dbUser.passwordHash.startsWith('$2'),
      '4. Password hashing verification (bcrypt hash stored in database, not plaintext)'
    );

    // 5. Successful login
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    assert(
      loginRes.status === 200 &&
        loginRes.body.token &&
        loginRes.body.user &&
        loginRes.body.user.email === testEmail &&
        loginRes.body.user.passwordHash === undefined,
      '5. Successful login (200 OK, token issued, no passwordHash)'
    );

    // 6. Invalid password
    const badPwRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword999!',
    });
    assert(
      badPwRes.status === 401 && badPwRes.body.message === 'Invalid email or password',
      '6. Invalid password rejection (401 Unauthorized)'
    );

    // 7. Unknown email
    const badEmailRes = await request('POST', '/api/auth/login', {
      email: 'nonexistent_user_999@example.com',
      password: 'AnyPassword123!',
    });
    assert(
      badEmailRes.status === 401 && badEmailRes.body.message === 'Invalid email or password',
      '7. Unknown email rejection (401 Unauthorized)'
    );

    // 8. Missing JWT
    const noJwtRes = await request('GET', '/api/auth/me', null, null);
    assert(
      noJwtRes.status === 401 && noJwtRes.body.error === 'Unauthorized',
      '8. Missing JWT rejection (401 Unauthorized)'
    );

    // 9. Invalid JWT format / malformed
    const badJwtRes = await request('GET', '/api/auth/me', null, 'not_a_valid_jwt_string');
    assert(
      badJwtRes.status === 401 && badJwtRes.body.error === 'Unauthorized',
      '9. Invalid / malformed JWT rejection (401 Unauthorized)'
    );

    // 10. Tampered JWT
    const tamperedToken = authToken.slice(0, -5) + 'abcde';
    const tamperedRes = await request('GET', '/api/auth/me', null, tamperedToken);
    assert(
      tamperedRes.status === 401 && tamperedRes.body.error === 'Unauthorized',
      '10. Tampered JWT signature rejection (401 Unauthorized)'
    );

    // 11. Successful /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, authToken);
    assert(
      meRes.status === 200 &&
        meRes.body.user &&
        meRes.body.user.id === userId &&
        meRes.body.user.email === testEmail &&
        meRes.body.user.passwordHash === undefined,
      '11. Successful /api/auth/me (200 OK with authenticated user profile)'
    );

    // 12. /api/auth/me with invalid authorization scheme (e.g. Basic instead of Bearer)
    const badSchemeRes = await new Promise((resolve) => {
      http.get('http://127.0.0.1:5000/api/auth/me', { headers: { Authorization: `Basic ${authToken}` } }, (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
      });
    });
    assert(
      badSchemeRes.status === 401 && badSchemeRes.body.error === 'Unauthorized',
      '12. /api/auth/me with invalid scheme (401 Unauthorized)'
    );

    // Security check: Verify passwordHash is never returned in any response
    const stringifiedResponses = JSON.stringify([regRes.body, loginRes.body, meRes.body]);
    assert(
      !stringifiedResponses.includes('passwordHash'),
      'Security check: passwordHash is NEVER present in any API response'
    );

    console.log(`\nRESULTS: ${passed}/${total} TESTS PASSED`);

    // Clean up test user
    await prisma.user.delete({ where: { id: userId } });
    console.log('Cleaned up test user successfully');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

// Start server on test port and run
const config = require('./dist/config/index.js').config;
setTimeout(() => {
  console.log('Server running, starting tests...');
  runTests();
}, 1000);