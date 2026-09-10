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

async function runWebRtcTests() {
  console.log('\n--- STARTING WEBRTC SIGNALING TEST SUITE (PHASE 5) ---');
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

  let userA, tokenA, userB, tokenB, userC, tokenC, meeting1, meeting2;
  let socketA, socketB, socketC;

  try {
    // Setup users
    const emailA = `rtc_host_${Date.now()}@example.com`;
    const emailB = `rtc_guest_${Date.now()}@example.com`;
    const emailC = `rtc_other_${Date.now()}@example.com`;

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

    const regC = await restRequest('POST', '/api/auth/register', {
      name: 'Other Charlie',
      email: emailC,
      password: 'Password123!',
    });
    userC = regC.body.user;
    tokenC = regC.body.token;

    // Create 2 separate meetings for cross-room testing
    const m1Res = await restRequest('POST', '/api/meetings', { title: 'WebRTC Room 1' }, tokenA);
    meeting1 = m1Res.body.meeting;

    const m2Res = await restRequest('POST', '/api/meetings', { title: 'WebRTC Room 2' }, tokenC);
    meeting2 = m2Res.body.meeting;

    // 1. Authenticated signaling connection
    socketA = createSocket(tokenA);
    await new Promise((resolve) => socketA.on('connect', resolve));
    assert(socketA.connected, '1. Authenticated signaling connection established');

    // 2. Unauthenticated signaling rejected
    await new Promise((resolve) => {
      const bad = createSocket(null);
      bad.on('connect', () => {
        assert(false, '2. Unauthenticated signaling rejected');
        bad.disconnect();
        resolve();
      });
      bad.on('connect_error', () => {
        assert(true, '2. Unauthenticated signaling connection rejected');
        bad.disconnect();
        resolve();
      });
    });

    socketB = createSocket(tokenB);
    await new Promise((resolve) => socketB.on('connect', resolve));

    socketC = createSocket(tokenC);
    await new Promise((resolve) => socketC.on('connect', resolve));

    // Join A & B to Meeting 1, C to Meeting 2
    await new Promise((resolve) => socketA.emit('meeting:join', { roomCode: meeting1.roomCode }, () => resolve()));
    await new Promise((resolve) => socketB.emit('meeting:join', { roomCode: meeting1.roomCode }, () => resolve()));
    await new Promise((resolve) => socketC.emit('meeting:join', { roomCode: meeting2.roomCode }, () => resolve()));

    // 3. Offer forwarding between authorized participants in same room
    const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=alice 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    await new Promise((resolve) => {
      socketB.once('webrtc:offer', (payload) => {
        assert(
          payload.senderUserId === userA.id &&
            payload.roomCode === meeting1.roomCode &&
            payload.sdp.type === 'offer',
          '3. Offer forwarding between authorized room participants (received by target peer)'
        );
        resolve();
      });

      socketA.emit(
        'webrtc:offer',
        {
          targetUserId: userB.id,
          roomCode: meeting1.roomCode,
          sdp: mockOfferSdp,
        },
        (res) => {
          if (!res.success) assert(false, '3. Offer send failed', res.error);
        }
      );
    });

    // 4. Answer forwarding between authorized participants
    const mockAnswerSdp = { type: 'answer', sdp: 'v=0\r\no=bob 654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    await new Promise((resolve) => {
      socketA.once('webrtc:answer', (payload) => {
        assert(
          payload.senderUserId === userB.id &&
            payload.roomCode === meeting1.roomCode &&
            payload.sdp.type === 'answer',
          '4. Answer forwarding between authorized room participants (received by initiator)'
        );
        resolve();
      });

      socketB.emit(
        'webrtc:answer',
        {
          targetUserId: userA.id,
          roomCode: meeting1.roomCode,
          sdp: mockAnswerSdp,
        },
        (res) => {
          if (!res.success) assert(false, '4. Answer send failed', res.error);
        }
      );
    });

    // 5. ICE candidate forwarding
    const mockCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    await new Promise((resolve) => {
      socketB.once('webrtc:ice-candidate', (payload) => {
        assert(
          payload.senderUserId === userA.id &&
            payload.candidate.candidate.includes('typ host'),
          '5. ICE candidate forwarding between authorized room participants'
        );
        resolve();
      });

      socketA.emit(
        'webrtc:ice-candidate',
        {
          targetUserId: userB.id,
          roomCode: meeting1.roomCode,
          candidate: mockCandidate,
        },
        (res) => {
          if (!res.success) assert(false, '5. Candidate send failed', res.error);
        }
      );
    });

    // 6. Unauthorized target rejected (signaling non-existent user)
    await new Promise((resolve) => {
      socketA.emit(
        'webrtc:offer',
        {
          targetUserId: '00000000-0000-0000-0000-000000000000',
          roomCode: meeting1.roomCode,
          sdp: mockOfferSdp,
        },
        (res) => {
          assert(
            !res.success && res.error.includes('Target participant not found'),
            '6. Unauthorized target rejected (target not in room)'
          );
          resolve();
        }
      );
    });

    // 7. Cross-room signaling rejected (A in Room 1 tries to signal C in Room 2)
    await new Promise((resolve) => {
      socketA.emit(
        'webrtc:offer',
        {
          targetUserId: userC.id,
          roomCode: meeting1.roomCode,
          sdp: mockOfferSdp,
        },
        (res) => {
          assert(
            !res.success && res.error.includes('Target participant not found in room'),
            '7. Cross-room signaling rejected (isolated room boundaries enforced)'
          );
          resolve();
        }
      );
    });

    // 8. Media state change broadcast
    await new Promise((resolve) => {
      socketB.once('media:state-changed', (payload) => {
        assert(
          payload.userId === userA.id &&
            payload.audioEnabled === false &&
            payload.videoEnabled === true &&
            payload.screenSharing === true,
          '8. Media state change broadcast (audio/video/screen state received by room)'
        );
        resolve();
      });

      socketA.emit('media:state-changed', {
        roomCode: meeting1.roomCode,
        audioEnabled: false,
        videoEnabled: true,
        screenSharing: true,
      });
    });

    // 9. Participant leave cleanup of signaling mappings
    await new Promise((resolve) => {
      socketB.emit('meeting:leave', { roomCode: meeting1.roomCode }, (res) => {
        assert(res.success, '9. Participant leave cleanly removes signaling association');
        resolve();
      });
    });

    // Verify A cannot signal B anymore
    await new Promise((resolve) => {
      socketA.emit(
        'webrtc:offer',
        {
          targetUserId: userB.id,
          roomCode: meeting1.roomCode,
          sdp: mockOfferSdp,
        },
        (res) => {
          assert(
            !res.success && res.error.includes('Target participant not found'),
            '9b. Departed participant no longer reachable for signaling'
          );
          resolve();
        }
      );
    });

    // 10. Meeting end cleanup of WebRTC room
    await new Promise((resolve) => {
      socketA.emit('meeting:end', { roomCode: meeting1.roomCode }, (res) => {
        assert(res.success, '10. Meeting end terminates WebRTC room and signaling channel');
        resolve();
      });
    });

    console.log(`\nPHASE 5 RESULTS: ${passed}/${total} TESTS PASSED`);

    // Clean up
    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();
    await prisma.meeting.deleteMany({
      where: { hostId: { in: [userA.id, userB.id, userC.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, userC.id] } },
    });
    console.log('Cleaned up WebRTC test resources successfully');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('WebRTC test execution error:', err);
    process.exit(1);
  }
}

setTimeout(() => {
  runWebRtcTests();
}, 1000);