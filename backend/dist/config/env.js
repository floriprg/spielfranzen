import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    jwtSecret: process.env.JWT_SECRET || 'spielfranzen_default_secret_key_change_me',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/spielfranzen?schema=public',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};
//# sourceMappingURL=env.js.map