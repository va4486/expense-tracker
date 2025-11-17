import { NextRequest, NextResponse } from 'next/server';
import { verifyPin, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, pin } = await request.json();

        if (!username || !pin) {
            return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 });
        }

        const user = await verifyPin(username, pin);

        if (!user) {
            return NextResponse.json({ error: 'Invalid username or PIN' }, { status: 401 });
        }

        const sessionId = createSession(user.id, user.username);

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username }
        });

        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;
    } catch (error) {
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
