const http = require('http');
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

async function runAiTests() {
  console.log('\n--- STARTING AI PRODUCTIVITY & MEETING INTELLIGENCE TEST SUITE (PHASE 8) ---');
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

  try {
    const emailA = `ai_host_${Date.now()}@example.com`;
    const emailB = `ai_guest_${Date.now()}@example.com`;
    const emailOutsider = `ai_outsider_${Date.now()}@example.com`;

    // 1. Setup users & meeting
    const regA = await restRequest('POST', '/api/auth/register', {
      name: 'AI Host Dr. Smith',
      email: emailA,
      password: 'Password123!',
    });
    userA = regA.body.user;
    tokenA = regA.body.token;

    const regB = await restRequest('POST', '/api/auth/register', {
      name: 'AI Guest Sarah',
      email: emailB,
      password: 'Password123!',
    });
    userB = regB.body.user;
    tokenB = regB.body.token;

    const regOutsider = await restRequest('POST', '/api/auth/register', {
      name: 'AI Outsider Eve',
      email: emailOutsider,
      password: 'Password123!',
    });
    outsider = regOutsider.body.user;
    tokenOutsider = regOutsider.body.token;

    const meetRes = await restRequest('POST', '/api/meetings', {
      title: 'Q4 Product Strategy & Architecture Review',
    }, tokenA);
    meeting = meetRes.body.meeting;

    // Add userB as participant
    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: userB.id,
        role: 'PARTICIPANT',
      },
    });

    // Seed notes
    await restRequest('PUT', `/api/meetings/${meeting.id}/notes`, {
      content: `# Product Strategy
- Migrate mesh WebRTC signaling to production cluster
- Conduct penetration security audit
- Launch collaborative whiteboard feature
Decided to approve the security audit timeline for next Monday.`,
    }, tokenA);

    // Seed agenda items
    await restRequest('POST', `/api/meetings/${meeting.id}/agenda`, {
      title: 'Signaling infrastructure readiness',
    }, tokenA);
    const agendaRes2 = await restRequest('POST', `/api/meetings/${meeting.id}/agenda`, {
      title: 'Security audit approval',
    }, tokenA);
    await restRequest('PATCH', `/api/meetings/${meeting.id}/agenda/${agendaRes2.body.item.id}`, {
      isCompleted: true,
    }, tokenA);

    // Seed chat conversation with actionable statements
    await prisma.chatMessage.createMany({
      data: [
        {
          meetingId: meeting.id,
          senderId: userA.id,
          senderName: userA.name,
          content: 'Welcome team! Great progress on the WebRTC mesh deployment.',
        },
        {
          meetingId: meeting.id,
          senderId: userB.id,
          senderName: userB.name,
          content: 'Thanks Dr. Smith. I will prepare the load testing benchmark report by Friday.',
        },
        {
          meetingId: meeting.id,
          senderId: userA.id,
          senderName: userA.name,
          content: 'Awesome! We decided to finalize the staging deployment schedule.',
        },
      ],
    });

    // ----------------------------------------------------
    // TEST 1: AI Summary Generation
    // ----------------------------------------------------
    const summaryRes = await restRequest('GET', `/api/meetings/${meeting.id}/ai/summary`, null, tokenA);
    assert(summaryRes.status === 200 && summaryRes.body.summary, '1. AI summary generation returns 200 OK');
    const summary = summaryRes.body.summary;
    assert(
      typeof summary.executiveSummary === 'string' && summary.executiveSummary.includes('Product Strategy'),
      '2. Executive summary synthesizes meeting title and context'
    );
    assert(
      Array.isArray(summary.keyDiscussionPoints) && summary.keyDiscussionPoints.length > 0,
      '3. Key discussion points extracted from agenda and notes'
    );
    assert(
      Array.isArray(summary.decisionsMade) && summary.decisionsMade.length > 0,
      '4. Decisions made extracted from chat and resolved agenda'
    );
    assert(
      summary.sentiment === 'POSITIVE' || summary.sentiment === 'ANALYTICAL',
      '5. Sentiment analysis calculated accurately'
    );
    assert(
      typeof summary.engagementScore === 'number' && summary.engagementScore > 0,
      '6. Team engagement score calculated'
    );

    // ----------------------------------------------------
    // TEST 2: Action Items Extraction
    // ----------------------------------------------------
    const extractRes = await restRequest('POST', `/api/meetings/${meeting.id}/ai/extract-actions`, {
      autoCreate: true,
    }, tokenB);
    assert(extractRes.status === 200, '7. AI extract-actions returns 200 OK');
    assert(
      Array.isArray(extractRes.body.extractedActionItems) && extractRes.body.extractedActionItems.length > 0,
      '8. Detected actionable task from chat message ("I will prepare the load testing...")'
    );

    // Verify auto-created in database
    const actionsInDb = await prisma.actionItem.findMany({ where: { meetingId: meeting.id } });
    assert(
      actionsInDb.some((a) => a.task.toLowerCase().includes('prepare the load testing')),
      '9. Extracted action item auto-persisted in ActionItem database table'
    );

    // ----------------------------------------------------
    // TEST 3: Contextual Q&A Assistant
    // ----------------------------------------------------
    const askSummary = await restRequest('POST', `/api/meetings/${meeting.id}/ai/ask`, {
      question: 'Give me a brief summary of what we discussed',
    }, tokenA);
    assert(
      askSummary.status === 200 && askSummary.body.answer.includes('Product Strategy'),
      '10. AI assistant answers summary question'
    );

    const askAgenda = await restRequest('POST', `/api/meetings/${meeting.id}/ai/ask`, {
      question: 'What were the agenda topics?',
    }, tokenB);
    assert(
      askAgenda.status === 200 && askAgenda.body.answer.includes('Signaling infrastructure'),
      '11. AI assistant answers agenda question'
    );

    const askWho = await restRequest('POST', `/api/meetings/${meeting.id}/ai/ask`, {
      question: 'Who participated in this meeting?',
    }, tokenA);
    assert(
      askWho.status === 200 && askWho.body.answer.includes('Sarah'),
      '12. AI assistant answers participant attendance question'
    );

    // ----------------------------------------------------
    // TEST 4: Security & Validation
    // ----------------------------------------------------
    const outsiderSummary = await restRequest('GET', `/api/meetings/${meeting.id}/ai/summary`, null, tokenOutsider);
    assert(outsiderSummary.status === 403, '13. Security: Non-participant forbidden from accessing AI summary (403)');

    const badAsk = await restRequest('POST', `/api/meetings/${meeting.id}/ai/ask`, {
      question: '   ',
    }, tokenA);
    assert(badAsk.status === 400, '14. Validation: Empty AI question rejected with 400 Bad Request');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    // Cleanup
    try {
      if (meeting) {
        await prisma.actionItem.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.agendaItem.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meetingNote.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.chatMessage.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meetingParticipant.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.meeting.deleteMany({ where: { id: meeting.id } });
      }
      if (userA) await prisma.user.deleteMany({ where: { email: userA.email } });
      if (userB) await prisma.user.deleteMany({ where: { email: userB.email } });
      if (outsider) await prisma.user.deleteMany({ where: { email: outsider.email } });
      console.log('Cleaned up AI test resources successfully');
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }

  console.log(`\nPHASE 8 RESULTS: ${passed}/${total} TESTS PASSED`);
  if (passed === total && total > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAiTests();
