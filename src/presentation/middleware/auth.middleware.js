import { auth } from '../../infrastructure/config/firebase.config.js';
import { AppError } from '../../shared/errors/app.error.js';

export class AuthMiddleware {
  static async verifyToken(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      console.log('Token received:', token);

      const decodedToken = await auth.verifyIdToken(token);
      console.log('Decoded token:', decodedToken);

      req.user = AuthMiddleware.buildUser(decodedToken);
      console.log('Built user:', req.user);
      next();
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Invalid or expired token';
      next(new AppError(message, 401));
    }
  }

  static extractToken(req) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    const token = header.split(' ')[1];
    if (!token) {
      throw new AppError('Invalid token format', 401);
    }

    return token;
  }

  static buildUser(decodedToken) {
    return {
      email: decodedToken.email,
      firebase_uid: decodedToken.user_id,
    };
  }
}

export default AuthMiddleware;
