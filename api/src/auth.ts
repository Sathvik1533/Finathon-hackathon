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
  } else if (typeof req.query?.token === 'string') {
    token = req.query.token;
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
  // Simple credential validation (can be extended to DB lookup or Google OAuth)
  if (username === config.adminUsername && password === config.adminPassword) {
    const user: AuthUser = {
      userId: 'u_admin_001',
      username: 'admin',
      role: 'admin',
      merchantId: config.demoMerchantId,
    };
    const token = generateToken(user);
    return { success: true, token, user };
  }

  if (username === 'reviewer' && password === 'reviewer123') {
    const user: AuthUser = {
      userId: 'u_rev_002',
      username: 'reviewer',
      role: 'reviewer',
      merchantId: config.demoMerchantId,
    };
    const token = generateToken(user);
    return { success: true, token, user };
  }

  return { success: false, message: 'Invalid credentials. Use admin/admin123 or reviewer/reviewer123' };
}
