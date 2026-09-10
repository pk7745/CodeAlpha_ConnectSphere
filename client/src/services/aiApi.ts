import { apiRequest } from './api';

export interface MeetingAiSummary {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  decisionsMade: string[];
  suggestedActionItems: {
    task: string;
    suggestedAssignee: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  sentiment: 'POSITIVE' | 'CONSTRUCTIVE' | 'ANALYTICAL' | 'NEUTRAL';
  engagementScore: number;
  generatedAt: string;
}

export async function getMeetingAiSummaryApi(meetingId: string): Promise<MeetingAiSummary> {
  const data = await apiRequest<{ success: boolean; summary: MeetingAiSummary }>(
    `/meetings/${meetingId}/ai/summary`
  );
  return data.summary;
}

export async function extractMeetingActionsAiApi(
  meetingId: string,
  autoCreate: boolean = true
): Promise<{ task: string; suggestedAssignee: string; priority: string }[]> {
  const data = await apiRequest<{
    success: boolean;
    extractedActionItems: { task: string; suggestedAssignee: string; priority: string }[];
  }>(`/meetings/${meetingId}/ai/extract-actions`, {
    method: 'POST',
    body: JSON.stringify({ autoCreate }),
  });
  return data.extractedActionItems || [];
}

export async function askMeetingAiAssistantApi(
  meetingId: string,
  question: string
): Promise<string> {
  const data = await apiRequest<{ success: boolean; answer: string }>(
    `/meetings/${meetingId}/ai/ask`,
    {
      method: 'POST',
      body: JSON.stringify({ question }),
    }
  );
  return data.answer;
}
