import { compare } from 'bcryptjs';
import { getUserByUsername } from './db';
import db from './db';

export interface Session {
    userId: number;
    username: string;
}

export function createSession(userId: number, username: string): string {
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const stmt = db.prepare('INSERT INTO sessions (session_id, user_id, username) VALUES (?, ?, ?)');
    stmt.run(sessionId, userId, username);
    return sessionId;
}

export function getSession(sessionId: string): Session | undefined {
    const stmt = db.prepare('SELECT user_id as userId, username FROM sessions WHERE session_id = ?');
    const session: any = stmt.get(sessionId);
    return session || undefined;
}

export function deleteSession(sessionId: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    stmt.run(sessionId);
}

export async function verifyPin(username: string, pin: string): Promise<any> {
    const user: any = getUserByUsername(username);
    if (!user) {
        return null;
    }

    const isValid = await compare(pin, user.pin_hash);
    if (!isValid) {
        return null;
    }

    return { id: user.id, username: user.username };
}
