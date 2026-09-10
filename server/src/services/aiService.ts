import { config } from '../config';

export interface MeetingAiInput {
  title: string;
  notes?: string;
  agendaItems?: { title: string; isCompleted: boolean }[];
  actionItems?: { task: string; assigneeName: string; status: string }[];
  chatMessages?: { senderName: string; content: string; createdAt: string }[];
  durationMinutes?: number;
  participantCount?: number;
}

export interface MeetingAiSummaryResult {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  decisionsMade: string[];
  suggestedActionItems: { task: string; suggestedAssignee: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  sentiment: 'POSITIVE' | 'CONSTRUCTIVE' | 'ANALYTICAL' | 'NEUTRAL';
  engagementScore: number; // 0 - 100
  generatedAt: string;
}

/**
 * Server-side Google Gemini 1.5 Flash caller with 8s timeout.
 */
async function callGeminiApi(prompt: string): Promise<string | null> {
  if (!config.geminiApiKey) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
      config.geminiApiKey
    )}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data: any = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

export class AiMeetingService {
  /**
   * Generates a structured executive summary and meeting intelligence.
   * Leverages server-side Gemini API when available, with automatic local NLP fallback.
   */
  public static async generateSummary(input: MeetingAiInput): Promise<MeetingAiSummaryResult> {
    // If Gemini API is configured, attempt intelligent synthesis
    if (config.geminiApiKey) {
      try {
        const prompt = `You are an executive meeting assistant. Analyze this meeting data and respond ONLY in valid JSON matching this schema:
{
  "executiveSummary": "string",
  "keyDiscussionPoints": ["string"],
  "decisionsMade": ["string"],
  "suggestedActionItems": [{"task": "string", "suggestedAssignee": "string", "priority": "HIGH"|"MEDIUM"|"LOW"}],
  "sentiment": "POSITIVE"|"CONSTRUCTIVE"|"ANALYTICAL"|"NEUTRAL",
  "engagementScore": number (0-100)
}

Meeting Data:
Title: ${input.title}
Notes: ${input.notes || 'None'}
Agenda: ${JSON.stringify(input.agendaItems || [])}
Chat: ${JSON.stringify(input.chatMessages || [])}
Actions: ${JSON.stringify(input.actionItems || [])}`;

        const rawText = await callGeminiApi(prompt);
        if (rawText) {
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.executiveSummary && Array.isArray(parsed.keyDiscussionPoints)) {
            return {
              ...parsed,
              generatedAt: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn('[AiMeetingService] Gemini API call failed, falling back to local NLP:', err);
      }
    }
    const notes = (input.notes || '').trim();
    const chat = input.chatMessages || [];
    const agenda = input.agendaItems || [];
    const actions = input.actionItems || [];

    // 1. Executive Summary Synthesis
    const summarySentences: string[] = [];
    summarySentences.push(
      `Meeting "${input.title}" was conducted with ${input.participantCount || 1} participant(s).`
    );

    if (agenda.length > 0) {
      const completed = agenda.filter((a) => a.isCompleted).length;
      summarySentences.push(
        `The team reviewed ${agenda.length} agenda item(s), completing ${completed} key objective(s).`
      );
    }

    if (notes) {
      const firstLines = notes
        .split('\n')
        .map((l) => l.replace(/^[#\-\*\s]+/, '').trim())
        .filter((l) => l.length > 5)
        .slice(0, 3);
      if (firstLines.length > 0) {
        summarySentences.push(`Key discussion highlights: "${firstLines.join('. ')}".`);
      }
    }

    if (chat.length > 0) {
      summarySentences.push(
        `Active collaboration took place across ${chat.length} shared team message(s).`
      );
    }

    const executiveSummary = summarySentences.join(' ');

    // 2. Key Discussion Points Extraction
    const keyDiscussionPoints: string[] = [];
    agenda.forEach((item) => {
      keyDiscussionPoints.push(`Agenda topic: ${item.title} (${item.isCompleted ? 'Completed' : 'Pending'})`);
    });

    if (notes) {
      const noteLines = notes
        .split('\n')
        .map((l) => l.replace(/^[#\-\*\s]+/, '').trim())
        .filter((l) => l.length > 10);
      noteLines.slice(0, 4).forEach((line) => {
        if (!keyDiscussionPoints.includes(line)) {
          keyDiscussionPoints.push(line);
        }
      });
    }

    if (keyDiscussionPoints.length === 0) {
      keyDiscussionPoints.push('General team alignment and project sync.');
    }

    // 3. Decisions Made Extraction
    const decisionsMade: string[] = [];
    const decisionKeywords = ['agree', 'decided', 'approved', 'confirmed', 'resolve', 'conclude', 'final'];
    chat.forEach((msg) => {
      const lower = msg.content.toLowerCase();
      if (decisionKeywords.some((kw) => lower.includes(kw))) {
        decisionsMade.push(`${msg.senderName}: "${msg.content.slice(0, 100)}"`);
      }
    });

    agenda
      .filter((a) => a.isCompleted)
      .forEach((a) => {
        decisionsMade.push(`Resolved agenda milestone: ${a.title}`);
      });

    if (decisionsMade.length === 0) {
      decisionsMade.push('Agreed to proceed with planned agenda deliverables.');
    }

    // 4. Action Items Extraction from Chat and Notes
    const actionRegex = /(?:i will|we will|need to|please|todo|action|can you|let's|assign)\s+([^.?!]+)/gi;
    const suggestedActionItems: { task: string; suggestedAssignee: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }[] = [];

    chat.forEach((msg) => {
      let match;
      while ((match = actionRegex.exec(msg.content)) !== null) {
        const detectedTask = match[1].trim();
        if (detectedTask.length > 4 && !suggestedActionItems.some((a) => a.task.toLowerCase() === detectedTask.toLowerCase())) {
          suggestedActionItems.push({
            task: detectedTask.charAt(0).toUpperCase() + detectedTask.slice(1),
            suggestedAssignee: msg.senderName,
            priority: detectedTask.toLowerCase().includes('urgent') || detectedTask.toLowerCase().includes('asap') ? 'HIGH' : 'MEDIUM',
          });
        }
      }
    });

    // Also pull pending action items already recorded
    actions
      .filter((a) => a.status !== 'DONE')
      .forEach((a) => {
        if (!suggestedActionItems.some((s) => s.task.toLowerCase() === a.task.toLowerCase())) {
          suggestedActionItems.push({
            task: a.task,
            suggestedAssignee: a.assigneeName || 'Unassigned',
            priority: 'MEDIUM',
          });
        }
      });

    // 5. Sentiment & Engagement Calculation
    const positiveWords = ['good', 'great', 'awesome', 'done', 'fixed', 'thanks', 'perfect', 'resolved', 'nice'];
    const constructiveWords = ['issue', 'problem', 'fix', 'test', 'review', 'block', 'improve', 'update', 'bug'];
    let posScore = 0;
    let conScore = 0;

    chat.forEach((msg) => {
      const lower = msg.content.toLowerCase();
      positiveWords.forEach((w) => {
        if (lower.includes(w)) posScore++;
      });
      constructiveWords.forEach((w) => {
        if (lower.includes(w)) conScore++;
      });
    });

    let sentiment: 'POSITIVE' | 'CONSTRUCTIVE' | 'ANALYTICAL' | 'NEUTRAL' = 'NEUTRAL';
    if (posScore > conScore && posScore > 0) {
      sentiment = 'POSITIVE';
    } else if (conScore > posScore && conScore > 0) {
      sentiment = 'CONSTRUCTIVE';
    } else if (chat.length > 5 || notes.length > 50) {
      sentiment = 'ANALYTICAL';
    }

    // Engagement score based on participation density
    const messageFactor = Math.min(chat.length * 5, 40);
    const agendaFactor = Math.min(agenda.length * 10, 30);
    const notesFactor = notes.length > 50 ? 20 : 10;
    const engagementScore = Math.min(100, Math.max(35, 10 + messageFactor + agendaFactor + notesFactor));

    return {
      executiveSummary,
      keyDiscussionPoints: keyDiscussionPoints.slice(0, 6),
      decisionsMade: decisionsMade.slice(0, 5),
      suggestedActionItems: suggestedActionItems.slice(0, 6),
      sentiment,
      engagementScore,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Answers contextual questions regarding the meeting transcript and agenda.
   */
  public static async answerQuestion(input: MeetingAiInput, question: string): Promise<string> {
    // If Gemini API is configured, attempt intelligent contextual answer
    if (config.geminiApiKey) {
      try {
        const prompt = `You are an AI assistant in a live meeting room. Answer the user's question concisely based strictly on the provided meeting context.

Meeting Context:
Title: ${input.title}
Notes: ${input.notes || 'None'}
Agenda: ${JSON.stringify(input.agendaItems || [])}
Chat: ${JSON.stringify(input.chatMessages || [])}
Action Items: ${JSON.stringify(input.actionItems || [])}

Question: ${question}`;

        const answer = await callGeminiApi(prompt);
        if (answer && answer.trim().length > 0) {
          return answer.trim();
        }
      } catch (err) {
        console.warn('[AiMeetingService] Gemini Q&A failed, falling back to local search:', err);
      }
    }

    const q = question.toLowerCase();
    const notes = input.notes || '';
    const chat = input.chatMessages || [];
    const agenda = input.agendaItems || [];
    const actions = input.actionItems || [];

    if (q.includes('summary') || q.includes('recap') || q.includes('overview')) {
      const summary = await this.generateSummary(input);
      return summary.executiveSummary;
    }

    if (q.includes('agenda') || q.includes('topics')) {
      if (agenda.length === 0) return 'No formal agenda items were logged for this meeting.';
      return `Agenda items discussed:\n${agenda.map((a, i) => `${i + 1}. ${a.title} [${a.isCompleted ? 'Completed' : 'Pending'}]`).join('\n')}`;
    }

    if (q.includes('action') || q.includes('tasks') || q.includes('next steps') || q.includes('todo')) {
      if (actions.length === 0) return 'No pending action items were logged.';
      return `Current action items:\n${actions.map((a, i) => `${i + 1}. ${a.task} (Assigned to: ${a.assigneeName}, Status: ${a.status})`).join('\n')}`;
    }

    if (q.includes('who') || q.includes('participant') || q.includes('attendance')) {
      const senders = Array.from(new Set(chat.map((m) => m.senderName)));
      return `Active contributors in this meeting include: ${senders.join(', ') || 'Current host and attendees'}.`;
    }

    // Search through notes or chat messages for relevant matches
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    const matchingMessages = chat.filter((m) =>
      words.some((w) => m.content.toLowerCase().includes(w))
    );

    if (matchingMessages.length > 0) {
      const snippets = matchingMessages.slice(-3).map((m) => `${m.senderName}: "${m.content}"`).join('\n');
      return `Here are relevant mentions from the meeting transcript:\n${snippets}`;
    }

    if (notes) {
      const matchingNoteLines = notes
        .split('\n')
        .filter((l) => words.some((w) => l.toLowerCase().includes(w)));
      if (matchingNoteLines.length > 0) {
        return `Relevant notes from this meeting:\n${matchingNoteLines.join('\n')}`;
      }
    }

    return `I reviewed the meeting records for "${input.title}". We discussed ${agenda.length} agenda items, recorded ${chat.length} chat messages, and logged ${actions.length} action items. Could you clarify your question?`;
  }
}
