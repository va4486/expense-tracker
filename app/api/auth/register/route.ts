import { NextRequest, NextResponse } from 'next/server';
import { createUser, createCategory } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { username, pin, securityAnswer } = await request.json();

        // Validate input
        if (!username || !pin) {
            return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 });
        }

        if (pin.length !== 6 || !/^\d+$/.test(pin)) {
            return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
        }

        if (!securityAnswer || securityAnswer.trim().length < 2) {
            return NextResponse.json({ error: 'Security answer is required (min 2 characters)' }, { status: 400 });
        }

        // Create user
        const userId = createUser(username, pin, securityAnswer);

        // Create default categories
        const essentialId = createCategory(Number(userId), 'Essential', 'essential');
        const nonEssentialId = createCategory(Number(userId), 'Non-Essential', 'non-essential');

        // Create default subcategories
        createCategory(Number(userId), 'Food', 'essential', Number(essentialId));
        createCategory(Number(userId), 'Transportation', 'essential', Number(essentialId));
        createCategory(Number(userId), 'Bills', 'essential', Number(essentialId));

        createCategory(Number(userId), 'Entertainment', 'non-essential', Number(nonEssentialId));
        createCategory(Number(userId), 'Shopping', 'non-essential', Number(nonEssentialId));

        return NextResponse.json({
            success: true,
            message: 'User registered successfully',
            userId
        });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
