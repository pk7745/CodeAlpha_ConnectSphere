const http = require('http');
const { io: ioClient } = require('socket.io-client');
require('./dist/server.js');
const { prisma } = require('./dist/lib/prisma.js');

async function restRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port: 5000, path, method, headers },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode, body: resData });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createSocket(token, options = {}) {
  return ioClient('http://127.0.0.1:5000', {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: false,
    autoConnect: true,
    ...options,
  });
}

async function runPollAndEngagementTests() {
  console.log('\n--- STARTING INTERACTIVE ENGAGEMENT & POLLS TEST SUITE (PHASE 9) ---');
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

  let userA, tokenA, userB, tokenB, outsider, tokenOutsider;
  let meeting;
  let socketA, socketB;

  try {
    const emailA = `poll_host_${Date.now()}@example.com`;
    const emailB = `poll_guest_${Date.now()}@example.com`;
    const emailOutsider = `poll_outsider_${Date.now()}@example.com`;

    // 1. Setup users & meeting
    const regA = await restRequest('POST', '/api/auth/register', {
      name: 'Poll Host Dave',
      email: emailA,
      password: 'Password123!',
    });
    userA = regA.body.user;
    tokenA = regA.body.token;

    const regB = await restRequest('POST', '/api/auth/register', {
      name: 'Poll Member Lisa',
      email: emailB,
      password: 'Password123!',
    });
    userB = regB.body.user;
    tokenB = regB.body.token;

    const regOutsider = await restRequest('POST', '/api/auth/register', {
      name: 'Poll Outsider',
      email: emailOutsider,
      password: 'Password123!',
    });
    outsider = regOutsider.body.user;
    tokenOutsider = regOutsider.body.token;

    const meetRes = await restRequest('POST', '/api/meetings', {
      title: 'Phase 9 Interactive Demo',
    }, tokenA);
    meeting = meetRes.body.meeting;

    socketA = createSocket(tokenA);
    await new Promise((res, rej) => {
      socketA.on('connect', res);
      socketA.on('connect_error', rej);
    });

    socketB = createSocket(tokenB);
    await new Promise((res, rej) => {
      socketB.on('connect', res);
      socketB.on('connect_error', rej);
    });

    await new Promise((res) => {
      socketA.emit('meeting:join', { roomCode: meeting.roomCode }, (r) => res(r));
    });
    await new Promise((res) => {
      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, (r) => res(r));
    });

    // ----------------------------------------------------
    // TEST 1: Create Poll
    // ----------------------------------------------------
    const createPollRes = await restRequest('POST', `/api/meetings/${meeting.id}/polls`, {
      question: 'Which WebRTC topology should we prioritize next?',
      options: ['Full Mesh with Simulcast', 'Selective Forwarding Unit (SFU)', 'Hybrid P2P Mesh'],
    }, tokenA);
    assert(
      createPollRes.status === 201 && createPollRes.body.poll && createPollRes.body.poll.options.length === 3,
      '1. Create interactive poll succeeds with multiple options (201 Created)'
    );
    const pollId = createPollRes.body.poll?.id;

    // ----------------------------------------------------
    // TEST 2: List Polls
    // ----------------------------------------------------
    const listPollsRes = await restRequest('GET', `/api/meetings/${meeting.id}/polls`, null, tokenB);
    assert(
      listPollsRes.status === 200 && Array.isArray(listPollsRes.body.polls) && listPollsRes.body.polls.length === 1,
      '2. Participant retrieves meeting polls list with initial zero tallies'
    );

    // ----------------------------------------------------
    // TEST 3: Cast Vote
    // ----------------------------------------------------
    const voteResB = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/vote`, {
      optionIdx: 1, // SFU
    }, tokenB);
    assert(
      voteResB.status === 200 && voteResB.body.voteCounts[1] === 1 && voteResB.body.totalVotes === 1,
      '3. Participant casts vote and receives updated tally'
    );

    const voteResA = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/vote`, {
      optionIdx: 0, // Mesh
    }, tokenA);
    assert(
      voteResA.status === 200 && voteResA.body.voteCounts[0] === 1 && voteResA.body.totalVotes === 2,
      '4. Host casts vote and verifies collective total'
    );

    // ----------------------------------------------------
    // TEST 4: Re-vote (Option change without vote duplication)
    // ----------------------------------------------------
    const revoteResB = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/vote`, {
      optionIdx: 0, // Changed from SFU to Mesh
    }, tokenB);
    assert(
      revoteResB.status === 200 && revoteResB.body.voteCounts[0] === 2 && revoteResB.body.voteCounts[1] === 0 && revoteResB.body.totalVotes === 2,
      '5. User changing vote re-allocates option count without duplicating total votes'
    );

    // ----------------------------------------------------
    // TEST 5: Close Poll
    // ----------------------------------------------------
    const closeRes = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/close`, {}, tokenA);
    assert(closeRes.status === 200, '6. Host closes poll successfully');

    // Voting in closed poll is rejected
    const voteClosedRes = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/vote`, {
      optionIdx: 2,
    }, tokenB);
    assert(voteClosedRes.status === 400, '7. Voting in closed poll is rejected with 400 Bad Request');

    // ----------------------------------------------------
    // TEST 6: In-Meeting Real-Time Reactions
    // ----------------------------------------------------
    let reactionReceivedByA = null;
    socketA.on('reaction:received', (data) => {
      reactionReceivedByA = data;
    });

    socketB.emit('reaction:send', {
      roomCode: meeting.roomCode,
      emoji: '🔥',
    });

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(
      reactionReceivedByA && reactionReceivedByA.emoji === '🔥' && reactionReceivedByA.senderName.includes('Lisa'),
      '8. Real-time floating reaction broadcast to all room participants'
    );

    // ----------------------------------------------------
    // TEST 7: Security - Outsider Rejected
    // ----------------------------------------------------
    const outsiderPolls = await restRequest('GET', `/api/meetings/${meeting.id}/polls`, null, tokenOutsider);
    assert(outsiderPolls.status === 403, '9. Security: Non-participant forbidden from accessing polls (403)');

    const outsiderVote = await restRequest('POST', `/api/meetings/${meeting.id}/polls/${pollId}/vote`, {
      optionIdx: 0,
    }, tokenOutsider);
    assert(outsiderVote.status === 403, '10. Security: Non-participant forbidden from voting (403)');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();

    try {
      if (meeting) {
        await prisma.pollVote.deleteMany({ where: { poll: { meetingId: meeting.id } } });
        await prisma.poll.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meetingParticipant.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meeting.deleteMany({ where: { id: meeting.id } });
      }
      if (userA) await prisma.user.deleteMany({ where: { email: userA.email } });
      if (userB) await prisma.user.deleteMany({ where: { email: userB.email } });
      if (outsider) await prisma.user.deleteMany({ where: { email: outsider.email } });
      console.log('Cleaned up poll & engagement test resources successfully');
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }

  console.log(`\nPHASE 9 RESULTS: ${passed}/${total} TESTS PASSED`);
  if (passed === total && total > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPollAndEngagementTests();
