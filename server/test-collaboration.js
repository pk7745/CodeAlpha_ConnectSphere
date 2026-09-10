const http = require('http');
const fs = require('fs');
const path = require('path');
const { io: ioClient } = require('socket.io-client');
require('./dist/server.js');
const { prisma } = require('./dist/lib/prisma.js');

async function restRequest(method, reqPath, body, token, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const headers = { ...customHeaders };

    if (body && !(body instanceof Buffer)) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    } else if (body instanceof Buffer) {
      payload = body;
      headers['Content-Length'] = body.length;
    }

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port: 5000, path: reqPath, method, headers },
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

function createMultipartBody(boundary, fieldName, filename, fileContent, mimeType = 'text/plain') {
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([
    Buffer.from(head, 'utf8'),
    Buffer.from(fileContent),
    Buffer.from(tail, 'utf8')
  ]);
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

async function runCollaborationTests() {
  console.log('\n--- STARTING REAL-TIME COLLABORATION TEST SUITE (PHASE 7) ---');
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
    const emailA = `collab_host_${Date.now()}@example.com`;
    const emailB = `collab_member_${Date.now()}@example.com`;
    const emailOutsider = `collab_outsider_${Date.now()}@example.com`;

    // 1. Setup users & meeting
    const regA = await restRequest('POST', '/api/auth/register', {
      name: 'Collab Host',
      email: emailA,
      password: 'Password123!',
    });
    userA = regA.body.user;
    tokenA = regA.body.token;

    const regB = await restRequest('POST', '/api/auth/register', {
      name: 'Collab Member',
      email: emailB,
      password: 'Password123!',
    });
    userB = regB.body.user;
    tokenB = regB.body.token;

    const regOutsider = await restRequest('POST', '/api/auth/register', {
      name: 'Collab Outsider',
      email: emailOutsider,
      password: 'Password123!',
    });
    outsider = regOutsider.body.user;
    tokenOutsider = regOutsider.body.token;

    const meetRes = await restRequest('POST', '/api/meetings', {
      title: 'Phase 7 Sprint Room',
    }, tokenA);
    meeting = meetRes.body.meeting;

    // Connect userB as participant via socket join so userB becomes member in DB
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

    // Join room
    await new Promise((res) => {
      socketA.emit('meeting:join', { roomCode: meeting.roomCode }, (resp) => res(resp));
    });
    await new Promise((res) => {
      socketB.emit('meeting:join', { roomCode: meeting.roomCode }, (resp) => res(resp));
    });

    // ----------------------------------------------------
    // TEST 1: Notes GET and PUT
    // ----------------------------------------------------
    const notesGet1 = await restRequest('GET', `/api/meetings/${meeting.id}/notes`, null, tokenA);
    assert(notesGet1.status === 200 && notesGet1.body.note, '1. Initial notes retrieval succeeds');

    const notesPut = await restRequest('PUT', `/api/meetings/${meeting.id}/notes`, {
      content: '# Sprint Goals\n- Finish Phase 7\n- Polish UI',
    }, tokenA);
    assert(
      notesPut.status === 200 && notesPut.body.note.content.includes('Sprint Goals'),
      '2. Meeting notes update succeeds with markdown content'
    );

    const notesGet2 = await restRequest('GET', `/api/meetings/${meeting.id}/notes`, null, tokenB);
    assert(
      notesGet2.status === 200 && notesGet2.body.note.content.includes('Sprint Goals'),
      '3. Meeting participant retrieves updated notes'
    );

    // ----------------------------------------------------
    // TEST 2: Agenda Items CRUD
    // ----------------------------------------------------
    const agendaAdd = await restRequest('POST', `/api/meetings/${meeting.id}/agenda`, {
      title: 'Review PRs',
      duration: 15,
    }, tokenA);
    assert(agendaAdd.status === 201 && agendaAdd.body.item.title === 'Review PRs', '4. Add agenda item succeeds');
    const agendaId = agendaAdd.body.item.id;

    const agendaToggle = await restRequest('PATCH', `/api/meetings/${meeting.id}/agenda/${agendaId}`, {
      isCompleted: true,
    }, tokenA);
    assert(agendaToggle.status === 200 && agendaToggle.body.item.isCompleted === true, '5. Toggle agenda item completion succeeds');

    const agendaList = await restRequest('GET', `/api/meetings/${meeting.id}/agenda`, null, tokenB);
    assert(
      agendaList.status === 200 && Array.isArray(agendaList.body.items) && agendaList.body.items.length === 1,
      '6. Participant retrieves full agenda list'
    );

    // ----------------------------------------------------
    // TEST 3: Action Items CRUD
    // ----------------------------------------------------
    const actionAdd = await restRequest('POST', `/api/meetings/${meeting.id}/actions`, {
      task: 'Prepare production release notes',
      assigneeName: userB.name,
    }, tokenA);
    assert(actionAdd.status === 201 && actionAdd.body.item.task.includes('release notes'), '7. Add action item succeeds');
    const actionId = actionAdd.body.item.id;

    const actionToggle = await restRequest('PATCH', `/api/meetings/${meeting.id}/actions/${actionId}`, {
      status: 'DONE',
    }, tokenB);
    assert(actionToggle.status === 200 && actionToggle.body.item.status === 'DONE', '8. Participant toggles action item completion');

    const actionList = await restRequest('GET', `/api/meetings/${meeting.id}/actions`, null, tokenA);
    assert(
      actionList.status === 200 && actionList.body.items.length === 1 && actionList.body.items[0].status === 'DONE',
      '9. Meeting host verifies updated action items'
    );

    // ----------------------------------------------------
    // TEST 4: Whiteboard GET & PUT
    // ----------------------------------------------------
    const wbInitial = await restRequest('GET', `/api/meetings/${meeting.id}/whiteboard`, null, tokenA);
    assert(wbInitial.status === 200 && wbInitial.body.whiteboard !== undefined, '10. Whiteboard retrieval succeeds');

    const sampleElements = JSON.stringify([{ type: 'line', points: [0, 0, 100, 100], color: '#10b981' }]);
    const wbPut = await restRequest('PUT', `/api/meetings/${meeting.id}/whiteboard`, {
      strokesJson: sampleElements,
    }, tokenA);
    assert(wbPut.status === 200 && wbPut.body.whiteboard.strokesJson === sampleElements, '11. Whiteboard snapshot update succeeds');

    // ----------------------------------------------------
    // TEST 5: File Sharing & Upload Security
    // ----------------------------------------------------
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const testDocContent = 'ConnectSphere Architecture Specifications v1.0';
    const multipartBody = createMultipartBody(
      boundary,
      'file',
      'architecture-specs.txt',
      testDocContent,
      'text/plain'
    );

    const fileUploadRes = await restRequest(
      'POST',
      `/api/meetings/${meeting.id}/files`,
      multipartBody,
      tokenA,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );
    assert(
      fileUploadRes.status === 201 && fileUploadRes.body.file && fileUploadRes.body.file.originalName.includes('architecture-specs.txt'),
      '12. Secure document upload succeeds (201 Created)'
    );
    const uploadedFileId = fileUploadRes.body.file?.id;

    // Reject executable upload
    const badFileBody = createMultipartBody(
      boundary,
      'file',
      'malicious_script.exe',
      'MZ9000000',
      'application/x-msdownload'
    );
    const badUploadRes = await restRequest(
      'POST',
      `/api/meetings/${meeting.id}/files`,
      badFileBody,
      tokenA,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );
    assert(
      badUploadRes.status === 400,
      '13. Security: Potentially malicious executable upload rejected (400 Bad Request)'
    );

    // List files
    const fileListRes = await restRequest('GET', `/api/meetings/${meeting.id}/files`, null, tokenB);
    assert(
      fileListRes.status === 200 && fileListRes.body.files.length === 1,
      '14. Participant can list shared meeting files'
    );

    // Download file
    const downloadRes = await restRequest('GET', `/api/meetings/${meeting.id}/files/${uploadedFileId}`, null, tokenB);
    assert(
      downloadRes.status === 200 && downloadRes.body.includes('Architecture Specifications'),
      '15. Authorized participant can download shared meeting file'
    );

    // ----------------------------------------------------
    // TEST 6: Security - Outsider Forbidden
    // ----------------------------------------------------
    const outsiderNotes = await restRequest('GET', `/api/meetings/${meeting.id}/notes`, null, tokenOutsider);
    assert(outsiderNotes.status === 403, '16. Security: Non-participant forbidden from accessing meeting notes (403)');

    const outsiderFiles = await restRequest('GET', `/api/meetings/${meeting.id}/files`, null, tokenOutsider);
    assert(outsiderFiles.status === 403, '17. Security: Non-participant forbidden from accessing meeting files (403)');

    // ----------------------------------------------------
    // TEST 7: Socket.IO Real-Time Chat & Persistence
    // ----------------------------------------------------
    let chatReceivedByB = null;
    socketB.on('chat:received', (msg) => {
      chatReceivedByB = msg;
    });

    socketA.emit('chat:send', {
      roomCode: meeting.roomCode,
      content: 'Hello team, welcome to ConnectSphere collaboration!',
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    assert(
      chatReceivedByB &&
      chatReceivedByB.content === 'Hello team, welcome to ConnectSphere collaboration!' &&
      chatReceivedByB.senderId === userA.id,
      '18. Socket.IO chat message broadcast to room members'
    );

    // Verify chat persisted in DB and retrievable via REST
    const chatHistoryRes = await restRequest('GET', `/api/meetings/${meeting.id}/chat`, null, tokenB);
    assert(
      chatHistoryRes.status === 200 &&
      chatHistoryRes.body.messages.some((m) => m.content.includes('welcome to ConnectSphere')),
      '19. Chat message persisted in database and retrievable via REST'
    );

    // ----------------------------------------------------
    // TEST 8: Socket.IO Whiteboard Real-Time Draw Sync
    // ----------------------------------------------------
    let wbDrawReceived = null;
    socketB.on('whiteboard:draw', (data) => {
      wbDrawReceived = data.stroke;
    });

    socketA.emit('whiteboard:draw', {
      roomCode: meeting.roomCode,
      stroke: { type: 'circle', x: 50, y: 50, radius: 25, color: '#3b82f6' },
    });

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(
      wbDrawReceived && wbDrawReceived.type === 'circle' && wbDrawReceived.radius === 25,
      '20. Socket.IO whiteboard real-time draw event broadcast to room members'
    );

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    // Cleanup sockets
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();

    // Cleanup DB
    try {
      if (meeting) {
        await prisma.sharedFile.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meetingNote.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.agendaItem.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.actionItem.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.whiteboardState.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.chatMessage.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meetingParticipant.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meeting.deleteMany({ where: { id: meeting.id } });
      }
      if (userA) await prisma.user.deleteMany({ where: { email: userA.email } });
      if (userB) await prisma.user.deleteMany({ where: { email: userB.email } });
      if (outsider) await prisma.user.deleteMany({ where: { email: outsider.email } });
      console.log('Cleaned up collaboration test resources successfully');
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }

  console.log(`\nPHASE 7 RESULTS: ${passed}/${total} TESTS PASSED`);
  if (passed === total && total > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCollaborationTests();
