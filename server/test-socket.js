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

async function runSocketTests() {
  console.log('\n--- STARTING REAL-TIME SIGNALING & PRESENCE TEST SUITE (PHASE 4) ---');
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

  let userA, tokenA, userB, tokenB, meeting;
  let socketA, socketB, socketC;

  try {
    // 0. Setup: Create test users and test meeting
    const emailA = `socket_host_${Date.now()}@example.com`;
    const emailB = `socket_guest_${Date.now()}@example.com`;

    const regA = await restRequest('POST', '/api/auth/register', {
      name: 'Host Alice',
      email: emailA,
      password: 'Password123!',
    });
    userA = regA.body.user;
    tokenA = regA.body.token;

    const regB = await restRequest('POST', '/api/auth/register', {
      name: 'Guest Bob',
      email: emailB,
      password: 'Password123!',
    });
    userB = regB.body.user;
    tokenB = regB.body.token;

    const meetingRes = await restRequest(
      'POST',
      '/api/meetings',
      { title: 'Real-Time Signaling Standup' },
      tokenA
    );
    meeting = meetingRes.body.meeting;

    // 1. Valid JWT socket connection
    await new Promise((resolve) => {
      socketA = createSocket(tokenA);
      socketA.on('connect', () => {
        assert(socketA.connected && socketA.id, '1. Valid JWT socket connection (connected with socket.id)');
        resolve();
      });
      socketA.on('connect_error', (err) => {
        assert(false, '1. Valid JWT socket connection', err.message);
        resolve();
      });
    });

    // 2. Missing JWT rejected
    await new Promise((resolve) => {
      const badSocket = createSocket(null);
      badSocket.on('connect', () => {
        assert(false, '2. Missing JWT rejected');
        badSocket.disconnect();
        resolve();
      });
      badSocket.on('connect_error', (err) => {
        assert(
          err.message.includes('Authentication token required'),
          '2. Missing JWT rejected (Authentication token required)'
        );
        badSocket.disconnect();
        resolve();
      });
    });

    // 3. Invalid JWT rejected
    await new Promise((resolve) => {
      const badSocket = createSocket('not.a.valid.jwt.token');
      badSocket.on('connect', () => {
        assert(false, '3. Invalid JWT rejected');
        badSocket.disconnect();
        resolve();
      });
      badSocket.on('connect_error', (err) => {
        assert(
          err.message.includes('Invalid or tampered token'),
          '3. Invalid JWT rejected (Invalid or tampered token)'
        );
        badSocket.disconnect();
        resolve();
      });
    });

    // 4. Tampered JWT rejected
    await new Promise((resolve) => {
      const tamperedToken = tokenA.slice(0, -6) + 'xxxxxx';
      const badSocket = createSocket(tamperedToken);
      badSocket.on('connect', () => {
        assert(false, '4. Tampered JWT rejected');
        badSocket.disconnect();
        resolve();
      });
      badSocket.on('connect_error', (err) => {
        assert(
          err.message.includes('Invalid or tampered token'),
          '4. Tampered JWT rejected (Invalid or tampered token)'
        );
        badSocket.disconnect();
        resolve();
      });
    });

    // Connect socketB
    await new Promise((resolve) => {
      socketB = createSocket(tokenB);
      socketB.on('connect', resolve);
    });

    // 5. Authenticated user joins valid meeting
    await new Promise((resolve) => {
      socketA.emit('meeting:join', { roomCode: meeting.roomCode }, (res) => {
        assert(
          res.success &&
            res.meeting.roomCode === meeting.roomCode &&
            res.participants.length === 1 &&
            res.participants[0].userId === userA.id &&
            res.participants[0].role === 'HOST',
          '5. Authenticated user joins valid meeting (receives meeting & host participant record)'
        );
        resolve();
      });
    });

    // 6. Nonexistent meeting join rejected
    await new Promise((resolve) => {
      socketB.emit('meeting:join', { roomCode: 'CONNECT-FAKE99' }, (res) => {
        assert(
          !res.success && res.error === 'Meeting not found',
          '6. Nonexistent meeting join rejected (Meeting not found)'
        );
        resolve();
      });
    });

    // 7. Participant joined event received by existing member
    await new Promise((resolve) => {
      socketA.once('participant:joined', (participant) => {
        assert(
          participant.userId === userB.id &&
            participant.name === 'Guest Bob' &&
            participant.role === 'PARTICIPANT' &&
            participant.presence === 'in_meeting',
          '7. Participant joined event received by room member (contains safe participant metadata)'
        );
        resolve();
      });

      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, (res) => {
        if (!res.success) {
          assert(false, '7. Guest Bob failed to join room');
          resolve();
        }
      });
    });

    // 8. Presence update broadcast
    await new Promise((resolve) => {
      socketA.once('presence:updated', (payload) => {
        assert(
          payload.userId === userB.id && payload.presence === 'away',
          '8. Presence update broadcast (received updated presence state)'
        );
        resolve();
      });

      socketB.emit('presence:update', { presence: 'away', roomCode: meeting.roomCode });
    });

    // 9. Duplicate join handled safely
    await new Promise((resolve) => {
      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, (res) => {
        assert(
          res.success && res.participants.length === 2,
          '9. Duplicate join handled safely without duplicate entries'
        );
        resolve();
      });
    });

    // 10. Participant leave event received
    await new Promise((resolve) => {
      socketA.once('participant:left', (payload) => {
        assert(
          payload.userId === userB.id && payload.roomCode === meeting.roomCode,
          '10. Participant leave event received by remaining members'
        );
        resolve();
      });

      socketB.emit('meeting:leave', { roomCode: meeting.roomCode }, (res) => {
        if (!res.success) {
          assert(false, '10. Leave failed');
          resolve();
        }
      });
    });

    // Re-join B for disconnect test
    await new Promise((resolve) => {
      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, () => resolve());
    });

    // 11. Unexpected disconnect handled
    await new Promise((resolve) => {
      socketA.once('participant:left', (payload) => {
        assert(
          payload.userId === userB.id && payload.roomCode === meeting.roomCode,
          '11. Unexpected socket disconnect handled (participant:left broadcast to room)'
        );
        resolve();
      });

      socketB.disconnect();
    });

    // 12. Non-host cannot end meeting
    // Reconnect socketB and attempt to end meeting
    socketB = createSocket(tokenB);
    await new Promise((resolve) => socketB.on('connect', resolve));
    await new Promise((resolve) => {
      socketB.emit('meeting:end', { roomCode: meeting.roomCode }, (res) => {
        assert(
          !res.success && res.error === 'Only the host can end the meeting',
          '12. Non-host cannot end meeting (Only the host can end the meeting)'
        );
        resolve();
      });
    });

    // Re-join B so B can receive meeting:ended broadcast
    await new Promise((resolve) => {
      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, () => resolve());
    });

    // 13. Host ends meeting & broadcasts meeting:ended
    await new Promise((resolve) => {
      let bReceived = false;
      socketB.once('meeting:ended', (payload) => {
        bReceived = payload.roomCode === meeting.roomCode && payload.endedAt;
      });

      socketA.emit('meeting:end', { roomCode: meeting.roomCode }, (res) => {
        setTimeout(() => {
          assert(
            res.success && bReceived,
            '13. Host ends meeting and broadcasts meeting:ended to all participants'
          );
          resolve();
        }, 100);
      });
    });

    // 14. Ended meeting rejects new joins
    await new Promise((resolve) => {
      socketA.emit('meeting:join', { roomCode: meeting.roomCode }, (res) => {
        assert(
          !res.success && res.error === 'Meeting has already ended',
          '14. Ended meeting rejects new join attempts (Meeting has already ended)'
        );
        resolve();
      });
    });

    // 15. Room cleanup after meeting end verified
    const dbEndedMeeting = await prisma.meeting.findUnique({
      where: { roomCode: meeting.roomCode },
    });
    assert(
      dbEndedMeeting && dbEndedMeeting.status === 'ENDED' && dbEndedMeeting.endedAt !== null,
      '15. Room cleanup & database meeting state persisted as ENDED'
    );

    // 16. Multiple participants and reconnect with new meeting
    const newMeetingRes = await restRequest(
      'POST',
      '/api/meetings',
      { title: 'Reconnect Multi-Peer Standup' },
      tokenA
    );
    const newMeeting = newMeetingRes.body.meeting;

    // Connect user C
    const emailC = `user_c_${Date.now()}@example.com`;
    const regC = await restRequest('POST', '/api/auth/register', {
      name: 'Charlie',
      email: emailC,
      password: 'Password123!',
    });
    socketC = createSocket(regC.body.token);
    await new Promise((resolve) => socketC.on('connect', resolve));

    // Join A, B, C to newMeeting
    await new Promise((resolve) => socketA.emit('meeting:join', { roomCode: newMeeting.roomCode }, () => resolve()));
    await new Promise((resolve) => socketB.emit('meeting:join', { roomCode: newMeeting.roomCode }, () => resolve()));
    const joinCRes = await new Promise((resolve) =>
      socketC.emit('meeting:join', { roomCode: newMeeting.roomCode }, (res) => resolve(res))
    );
    assert(
      joinCRes.success && joinCRes.participants.length === 3,
      '16. Multiple participants in same room (3 active room members)'
    );

    // 17. Reconnect does not duplicate participant
    socketC.disconnect();
    socketC = createSocket(regC.body.token);
    await new Promise((resolve) => socketC.on('connect', resolve));
    const rejoinCRes = await new Promise((resolve) =>
      socketC.emit('meeting:join', { roomCode: newMeeting.roomCode }, (res) => resolve(res))
    );
    assert(
      rejoinCRes.success && rejoinCRes.participants.length === 3,
      '17. Socket reconnect does not duplicate participant record'
    );

    // 18. Server stability after invalid socket payloads
    socketA.emit('meeting:join', null);
    socketA.emit('meeting:join', { roomCode: 12345 });
    socketA.emit('unknown_event_xyz', { foo: 'bar' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(socketA.connected, '18. Server remains completely stable after malformed socket events');

    console.log(`\nPHASE 4 RESULTS: ${passed}/${total} TESTS PASSED`);

    // Clean up
    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();
    await prisma.meeting.deleteMany({
      where: { hostId: { in: [userA.id, userB.id, regC.body.user.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, regC.body.user.id] } },
    });
    console.log('Cleaned up test sockets, meetings, and users successfully');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Socket test error:', err);
    process.exit(1);
  }
}

setTimeout(() => {
  runSocketTests();
}, 1000);