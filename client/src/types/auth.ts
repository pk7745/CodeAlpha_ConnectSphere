export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}