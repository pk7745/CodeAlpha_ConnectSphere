export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: any): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}