import { apiRequest, API_BASE } from './api';

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface SharedFileItem {
  id: string;
  meetingId: string;
  uploaderId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export interface AgendaItem {
  id: string;
  meetingId: string;
  title: string;
  order: number;
  isCompleted: boolean;
  completedBy?: string | null;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  task: string;
  assigneeName: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdAt: string;
  updatedAt: string;
}

// 1. Chat History
export async function getChatMessagesApi(meetingId: string): Promise<ChatMessage[]> {
  const data = await apiRequest<{ success: boolean; messages: ChatMessage[] }>(
    `/meetings/${meetingId}/chat`
  );
  return data.messages || [];
}

// 2. Meeting Notes
export async function getMeetingNotesApi(meetingId: string): Promise<string> {
  const data = await apiRequest<{ success: boolean; note: { content: string } }>(
    `/meetings/${meetingId}/notes`
  );
  return data.note?.content || '';
}

export async function updateMeetingNotesApi(meetingId: string, content: string): Promise<string> {
  const data = await apiRequest<{ success: boolean; note: { content: string } }>(
    `/meetings/${meetingId}/notes`,
    {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }
  );
  return data.note?.content || '';
}

// 3. Agenda Items
export async function getAgendaItemsApi(meetingId: string): Promise<AgendaItem[]> {
  const data = await apiRequest<{ success: boolean; items: AgendaItem[] }>(
    `/meetings/${meetingId}/agenda`
  );
  return data.items || [];
}

export async function createAgendaItemApi(meetingId: string, title: string): Promise<AgendaItem> {
  const data = await apiRequest<{ success: boolean; item: AgendaItem }>(
    `/meetings/${meetingId}/agenda`,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    }
  );
  return data.item;
}

export async function toggleAgendaItemApi(
  meetingId: string,
  itemId: string,
  isCompleted: boolean
): Promise<AgendaItem> {
  const data = await apiRequest<{ success: boolean; item: AgendaItem }>(
    `/meetings/${meetingId}/agenda/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }
  );
  return data.item;
}

export async function deleteAgendaItemApi(meetingId: string, itemId: string): Promise<void> {
  await apiRequest(`/meetings/${meetingId}/agenda/${itemId}`, {
    method: 'DELETE',
  });
}

// 4. Action Items
export async function getActionItemsApi(meetingId: string): Promise<ActionItem[]> {
  const data = await apiRequest<{ success: boolean; items: ActionItem[] }>(
    `/meetings/${meetingId}/actions`
  );
  return data.items || [];
}

export async function createActionItemApi(
  meetingId: string,
  task: string,
  assigneeName?: string
): Promise<ActionItem> {
  const data = await apiRequest<{ success: boolean; item: ActionItem }>(
    `/meetings/${meetingId}/actions`,
    {
      method: 'POST',
      body: JSON.stringify({ task, assigneeName }),
    }
  );
  return data.item;
}

export async function updateActionItemApi(
  meetingId: string,
  itemId: string,
  status?: string,
  assigneeName?: string
): Promise<ActionItem> {
  const data = await apiRequest<{ success: boolean; item: ActionItem }>(
    `/meetings/${meetingId}/actions/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, assigneeName }),
    }
  );
  return data.item;
}

export async function deleteActionItemApi(meetingId: string, itemId: string): Promise<void> {
  await apiRequest(`/meetings/${meetingId}/actions/${itemId}`, {
    method: 'DELETE',
  });
}

// 5. Whiteboard
export async function getWhiteboardStateApi(meetingId: string): Promise<string> {
  const data = await apiRequest<{ success: boolean; whiteboard: { strokesJson: string } }>(
    `/meetings/${meetingId}/whiteboard`
  );
  return data.whiteboard?.strokesJson || '[]';
}

export async function saveWhiteboardStateApi(meetingId: string, strokesJson: string): Promise<void> {
  await apiRequest(`/meetings/${meetingId}/whiteboard`, {
    method: 'PUT',
    body: JSON.stringify({ strokesJson }),
  });
}

// 6. Shared Files
export async function getSharedFilesApi(meetingId: string): Promise<SharedFileItem[]> {
  const data = await apiRequest<{ success: boolean; files: SharedFileItem[] }>(
    `/meetings/${meetingId}/files`
  );
  return data.files || [];
}

export async function uploadSharedFileApi(meetingId: string, file: File): Promise<SharedFileItem> {
  const formData = new FormData();
  formData.append('file', file);

  const data = await apiRequest<{ success: boolean; file: SharedFileItem }>(
    `/meetings/${meetingId}/files`,
    {
      method: 'POST',
      body: formData,
    }
  );
  return data.file;
}

export async function deleteSharedFileApi(meetingId: string, fileId: string): Promise<void> {
  await apiRequest(`/meetings/${meetingId}/files/${fileId}`, {
    method: 'DELETE',
  });
}

export async function downloadSharedFileApi(
  meetingId: string,
  fileId: string,
  originalName: string
): Promise<void> {
  const token = localStorage.getItem('connectsphere_token');
  const response = await fetch(`${API_BASE}/meetings/${meetingId}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
