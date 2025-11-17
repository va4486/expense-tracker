import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setDailyLimit, getDailyLimit, getDailyExpenses } from '@/lib/db';

export async function GET(request: NextRequest) {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const limit: any = getDailyLimit(session.userId, date);
    const expenses: any = getDailyExpenses(session.userId, date);

    const dailyLimit = limit?.limit_amount || 0;
    const totalSpent = expenses?.total || 0;
    const remaining = dailyLimit - totalSpent;

    return NextResponse.json({
        date,
        dailyLimit,
        totalSpent,
        remaining,
        percentUsed: dailyLimit > 0 ? (totalSpent / dailyLimit) * 100 : 0
    });
}

export async function POST(request: NextRequest) {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { limitAmount, date } = await request.json();

        if (!limitAmount) {
            return NextResponse.json({ error: 'Limit amount is required' }, { status: 400 });
        }

        const targetDate = date || new Date().toISOString().split('T')[0];

        setDailyLimit(session.userId, parseFloat(limitAmount), targetDate);

        return NextResponse.json({
            success: true,
            message: 'Daily limit set successfully'
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to set daily limit' }, { status: 500 });
    }
}
