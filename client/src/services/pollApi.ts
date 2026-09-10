import { apiRequest } from './api';

export interface PollItem {
  id: string;
  meetingId: string;
  question: string;
  options: string[];
  status: 'OPEN' | 'CLOSED';
  creator: {
    id: string;
    name: string;
  };
  createdAt: string;
  totalVotes: number;
  voteCounts: number[];
  userVotedOption: number | null;
}

export async function getMeetingPollsApi(meetingId: string): Promise<PollItem[]> {
  const data = await apiRequest<{ success: boolean; polls: PollItem[] }>(
    `/meetings/${meetingId}/polls`
  );
  return data.polls || [];
}

export async function createMeetingPollApi(
  meetingId: string,
  question: string,
  options: string[]
): Promise<PollItem> {
  const data = await apiRequest<{ success: boolean; poll: PollItem }>(
    `/meetings/${meetingId}/polls`,
    {
      method: 'POST',
      body: JSON.stringify({ question, options }),
    }
  );
  return data.poll;
}

export async function voteMeetingPollApi(
  meetingId: string,
  pollId: string,
  optionIdx: number
): Promise<{ userVotedOption: number; voteCounts: number[]; totalVotes: number }> {
  const data = await apiRequest<{
    success: boolean;
    userVotedOption: number;
    voteCounts: number[];
    totalVotes: number;
  }>(`/meetings/${meetingId}/polls/${pollId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ optionIdx }),
  });
  return data;
}

export async function closeMeetingPollApi(
  meetingId: string,
  pollId: string
): Promise<void> {
  await apiRequest(`/meetings/${meetingId}/polls/${pollId}/close`, {
    method: 'POST',
  });
}
