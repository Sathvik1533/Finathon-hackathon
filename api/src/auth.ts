import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'admin' | 'reviewer' | 'auditor';
  merchantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '24h' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function loginUser(username: string, password: string): { success: boolean; token?: string; user?: AuthUser; message?: string } {
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Username and password are required.' };
  }

  // Exact admin credential check
  if (cleanUser === config.adminUsername) {
    if (cleanPass !== config.adminPassword) {
      return { success: false, message: 'Invalid password for admin user.' };
    }
    const user: AuthUser = {
      userId: 'u_admin_001',
      username: 'admin',
      role: 'admin',
      merchantId: config.demoMerchantId,
    };
    const token = generateToken(user);
    return { success: true, token, user };
  }

  // Exact reviewer credential check
  if (cleanUser === 'reviewer') {
    if (cleanPass !== 'reviewer123') {
      return { success: false, message: 'Invalid password for reviewer.' };
    }
    const user: AuthUser = {
      userId: 'u_rev_002',
      username: 'reviewer',
      role: 'reviewer',
      merchantId: config.demoMerchantId,
    };
    const token = generateToken(user);
    return { success: true, token, user };
  }

  // Support operator / corporate email logins (e.g. nandithat3@gmail.com)
  if (cleanUser.includes('@')) {
    if (cleanPass.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters.' };
    }
    const user: AuthUser = {
      userId: `u_${cleanUser.replace(/[^a-zA-Z0-9]/g, '_')}`,
      username: cleanUser,
      role: 'admin',
      merchantId: config.demoMerchantId,
    };
    const token = generateToken(user);
    return { success: true, token, user };
  }

  return { success: false, message: 'Invalid credentials. Use admin/admin123 or your authorized email.' };
}
