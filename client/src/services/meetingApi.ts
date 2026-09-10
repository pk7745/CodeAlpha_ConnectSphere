import { apiRequest } from './api';
import { Meeting, MeetingSummary } from '../types/meeting';

export async function createMeetingApi(title: string): Promise<Meeting> {
  const data = await apiRequest<{ message: string; meeting: Meeting }>('/meetings', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return data.meeting;
}

export async function getUserMeetingsApi(): Promise<Meeting[]> {
  const data = await apiRequest<{ meetings: Meeting[] }>('/meetings', {
    method: 'GET',
  });
  return data.meetings;
}

export async function getMeetingByCodeApi(code: string): Promise<Meeting> {
  const normalized = code.trim().toUpperCase();
  const data = await apiRequest<{ meeting: Meeting }>(`/meetings/code/${normalized}`, {
    method: 'GET',
  });
  return data.meeting;
}

export async function getMeetingByIdApi(id: string): Promise<Meeting> {
  const data = await apiRequest<{ meeting: Meeting }>(`/meetings/${id}`, {
    method: 'GET',
  });
  return data.meeting;
}

export async function endMeetingApi(id: string): Promise<Meeting> {
  const data = await apiRequest<{ message: string; meeting: Meeting }>(`/meetings/${id}/end`, {
    method: 'POST',
  });
  return data.meeting;
}

export async function getMeetingSummaryApi(id: string): Promise<MeetingSummary> {
  const data = await apiRequest<{ summary: MeetingSummary }>(`/meetings/${id}/summary`, {
    method: 'GET',
  });
  return data.summary;
}