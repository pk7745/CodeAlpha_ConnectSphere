import { SafeUser } from '../utils/sanitize';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}
export {};