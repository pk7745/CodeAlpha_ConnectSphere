const http = require('http');
require('./dist/server.js');
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

async function runMeetingTests() {
  console.log('\n--- STARTING MEETING MANAGEMENT VERIFICATION SUITE (PHASE 3) ---');
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

  let userA, tokenA, userB, tokenB, meetingA;

  try {
    // 0. Setup: Create two test users (Host A and Non-Host B)
    const emailA = `host_a_${Date.now()}@example.com`;
    const emailB = `user_b_${Date.now()}@example.com`;

    const regA = await request('POST', '/api/auth/register', {
      name: 'Host User A',
      email: emailA,
      password: 'Password123!',
    });
    userA = regA.body.user;
    tokenA = regA.body.token;

    const regB = await request('POST', '/api/auth/register', {
      name: 'User B',
      email: emailB,
      password: 'Password123!',
    });
    userB = regB.body.user;
    tokenB = regB.body.token;

    // 1. Create meeting
    const createRes = await request(
      'POST',
      '/api/meetings',
      { title: 'Sprint Planning Session' },
      tokenA
    );
    assert(
      createRes.status === 201 &&
        createRes.body.meeting &&
        createRes.body.meeting.title === 'Sprint Planning Session' &&
        createRes.body.meeting.roomCode &&
        createRes.body.meeting.roomCode.startsWith('CONNECT-') &&
        createRes.body.meeting.status === 'ACTIVE' &&
        createRes.body.meeting.participantCount === 1,
      '1. Create meeting (201, roomCode CONNECT-XXXXXX, status ACTIVE, host participant created)'
    );
    meetingA = createRes.body.meeting;

    // 2. Create meeting without authentication
    const noAuthCreate = await request(
      'POST',
      '/api/meetings',
      { title: 'Unauthorized Meeting' },
      null
    );
    assert(
      noAuthCreate.status === 401 && noAuthCreate.body.error === 'Unauthorized',
      '2. Create meeting without authentication (401 Unauthorized)'
    );

    // 3. Create meeting with invalid title (empty string)
    const invalidTitleCreate = await request(
      'POST',
      '/api/meetings',
      { title: '   ' },
      tokenA
    );
    assert(
      invalidTitleCreate.status === 400 && invalidTitleCreate.body.error === 'Validation Error',
      '3. Create meeting with invalid title (400 Validation Error)'
    );

    // 4. Unique room code generation
    const secondMeetingRes = await request(
      'POST',
      '/api/meetings',
      { title: 'Architecture Review' },
      tokenA
    );
    assert(
      secondMeetingRes.status === 201 &&
        secondMeetingRes.body.meeting.roomCode !== meetingA.roomCode &&
        secondMeetingRes.body.meeting.roomCode.startsWith('CONNECT-'),
      '4. Unique room code generation (distinct non-colliding room codes)'
    );

    // 5. Get user's meetings
    const userMeetingsRes = await request('GET', '/api/meetings', null, tokenA);
    assert(
      userMeetingsRes.status === 200 &&
        Array.isArray(userMeetingsRes.body.meetings) &&
        userMeetingsRes.body.meetings.length >= 2 &&
        userMeetingsRes.body.meetings[0].isHost === true,
      '5. Get user\'s meetings (200 OK, ordered list with host status)'
    );

    // 6. Get meeting by ID (as Host)
    const getByIdRes = await request('GET', `/api/meetings/${meetingA.id}`, null, tokenA);
    assert(
      getByIdRes.status === 200 &&
        getByIdRes.body.meeting &&
        getByIdRes.body.meeting.id === meetingA.id &&
        getByIdRes.body.meeting.participants.length === 1 &&
        getByIdRes.body.meeting.participants[0].role === 'HOST',
      '6. Get meeting by ID (200 OK, includes host & participant list)'
    );

    // 7. Unauthorized meeting access (User B accessing User A's private meeting)
    const unauthGetRes = await request('GET', `/api/meetings/${meetingA.id}`, null, tokenB);
    assert(
      unauthGetRes.status === 403 && unauthGetRes.body.error === 'Forbidden',
      '7. Unauthorized meeting access (403 Forbidden for non-participant user)'
    );

    // 8. Get meeting by room code
    const getByCodeRes = await request(
      'GET',
      `/api/meetings/code/${meetingA.roomCode}`,
      null,
      tokenB
    );
    assert(
      getByCodeRes.status === 200 &&
        getByCodeRes.body.meeting &&
        getByCodeRes.body.meeting.roomCode === meetingA.roomCode &&
        getByCodeRes.body.meeting.title === 'Sprint Planning Session',
      '8. Get meeting by room code (200 OK, resolved metadata)'
    );

    // 9. Invalid room code
    const invalidCodeRes = await request(
      'GET',
      '/api/meetings/code/CONNECT-NONEXIST99',
      null,
      tokenA
    );
    assert(
      invalidCodeRes.status === 404 && invalidCodeRes.body.error === 'Not Found',
      '9. Invalid room code returns 404 Not Found'
    );

    // 10. Non-host cannot end meeting
    const nonHostEndRes = await request(
      'POST',
      `/api/meetings/${meetingA.id}/end`,
      null,
      tokenB
    );
    assert(
      nonHostEndRes.status === 403 && nonHostEndRes.body.error === 'Forbidden',
      '10. Non-host cannot end meeting (403 Forbidden)'
    );

    // 11. Host ends meeting
    const hostEndRes = await request(
      'POST',
      `/api/meetings/${meetingA.id}/end`,
      null,
      tokenA
    );
    assert(
      hostEndRes.status === 200 &&
        hostEndRes.body.meeting &&
        hostEndRes.body.meeting.status === 'ENDED' &&
        hostEndRes.body.meeting.endedAt !== null,
      '11. Host ends meeting (200 OK, status ENDED, endedAt set)'
    );

    // 12. Ended meeting state verification (idempotent re-end)
    const reEndRes = await request(
      'POST',
      `/api/meetings/${meetingA.id}/end`,
      null,
      tokenA
    );
    assert(
      reEndRes.status === 200 &&
        reEndRes.body.meeting.status === 'ENDED' &&
        reEndRes.body.message === 'Meeting has already ended',
      '12. Ended meeting state safely preserved'
    );

    // 13. Meeting summary
    const summaryRes = await request(
      'GET',
      `/api/meetings/${meetingA.id}/summary`,
      null,
      tokenA
    );
    assert(
      summaryRes.status === 200 &&
        summaryRes.body.summary &&
        summaryRes.body.summary.id === meetingA.id &&
        summaryRes.body.summary.status === 'ENDED' &&
        typeof summaryRes.body.summary.durationSeconds === 'number' &&
        summaryRes.body.summary.participantCount === 1,
      '13. Meeting summary (200 OK, duration, participant count, host info)'
    );

    // 14. Invalid meeting ID
    const invalidIdRes = await request(
      'GET',
      '/api/meetings/00000000-0000-0000-0000-000000000000',
      null,
      tokenA
    );
    assert(
      invalidIdRes.status === 404 && invalidIdRes.body.error === 'Not Found',
      '14. Invalid meeting ID returns 404 Not Found'
    );

    // Security check: Verify no passwordHash or secrets leak
    const payloadStr = JSON.stringify([
      createRes.body,
      userMeetingsRes.body,
      getByIdRes.body,
      getByCodeRes.body,
      summaryRes.body,
    ]);
    assert(
      !payloadStr.includes('passwordHash') && !payloadStr.includes('jwtSecret'),
      'Security check: Sensitive credentials and hashes never leak in meeting APIs'
    );

    console.log(`\nPHASE 3 RESULTS: ${passed}/${total} TESTS PASSED`);

    // Clean up test meetings and users
    await prisma.meeting.deleteMany({ where: { hostId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    console.log('Cleaned up test meetings and users successfully');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Meeting test execution error:', err);
    process.exit(1);
  }
}

setTimeout(() => {
  runMeetingTests();
}, 1000);