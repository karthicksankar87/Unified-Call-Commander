import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ALLOWED_ROLES = ['admin', 'staff', 'executive'];

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!ALLOWED_ROLES.includes(decoded.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
