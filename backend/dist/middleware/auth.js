import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
export function generateToken(payload) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
export async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: 'Access token required.' });
        return;
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
}
export function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
            ? socket.handshake.headers.authorization.slice(7)
            : null);
    if (!token) {
        return next(new Error('Authentication error: Token required.'));
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.data.user = decoded;
        next();
    }
    catch (err) {
        next(new Error('Authentication error: Invalid token.'));
    }
}
//# sourceMappingURL=auth.js.map