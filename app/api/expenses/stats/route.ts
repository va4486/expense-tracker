import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getExpenseStats } from '@/lib/db';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day';

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const stats = getExpenseStats(session.userId, startDate, endDate, groupBy);
    return NextResponse.json({ stats });
}
