import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export const hashPassword  = (p: string) => bcrypt.hash(p, 10);
export const comparePassword = (p: string, h: string) => bcrypt.compare(p, h);
export const hashToken = (t: string) =>
  crypto.createHash('sha256').update(t).digest('hex');
export const generateSecureToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');
export const hashAgentSecret = (raw: string, salt: string) =>
  crypto.createHmac('sha256', salt).update(raw).digest('hex');
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
