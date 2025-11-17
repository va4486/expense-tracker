import { NextRequest, NextResponse } from 'next/server';
import { verifySecurityAnswer, resetUserPin, getUserByUsername } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { username, securityAnswer, newPin } = await request.json();

        // Validate input
        if (!username || !securityAnswer || !newPin) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
            return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
        }

        // Check if user exists
        const user: any = getUserByUsername(username);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user has security answer set
        if (!user.security_answer_hash) {
            return NextResponse.json({ error: 'No security question set for this account' }, { status: 400 });
        }

        // Verify security answer
        const isValid = verifySecurityAnswer(username, securityAnswer);
        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect security answer' }, { status: 401 });
        }

        // Reset PIN
        const success = resetUserPin(username, newPin);
        if (!success) {
            return NextResponse.json({ error: 'Failed to reset PIN' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'PIN reset successfully'
        });
    } catch (error) {
        return NextResponse.json({ error: 'PIN reset failed' }, { status: 500 });
    }
}
