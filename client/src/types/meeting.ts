export interface MeetingHost {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface MeetingParticipantInfo {
  id: string;
  role: 'HOST' | 'PARTICIPANT' | string;
  joinedAt: string;
  leftAt?: string | null;
  user: MeetingHost;
}

export interface Meeting {
  id: string;
  roomCode: string;
  title: string;
  status: 'ACTIVE' | 'ENDED' | string;
  createdAt: string;
  endedAt?: string | null;
  host: MeetingHost;
  isHost?: boolean;
  userRole?: 'HOST' | 'PARTICIPANT' | string;
  participantCount?: number;
  participants?: MeetingParticipantInfo[];
}

export interface MeetingSummary {
  id: string;
  title: string;
  roomCode: string;
  status: string;
  host: MeetingHost;
  createdAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  participantCount: number;
  participants: MeetingParticipantInfo[];
}