import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createExpense, getExpenses } from '@/lib/db';

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
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: string | undefined;
    let endDate: string | undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    if (period) {
        if (period === 'week') {
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay());
            startDate = firstDayOfWeek.toISOString().split('T')[0];
        } else if (period === 'month') {
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = firstDayOfMonth.toISOString().split('T')[0];
        } else if (period === 'year') {
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            startDate = firstDayOfYear.toISOString().split('T')[0];
        }
        // For 'all' period, startDate and endDate remain undefined, fetching all
    } else if (startDateParam && endDateParam) {
        startDate = startDateParam;
        endDate = endDateParam;
    } else {
        // Default to today's expenses if no period or specific dates are provided
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }

    const expenses = getExpenses(session.userId, startDate, endDate);
    return NextResponse.json({ expenses });
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
        const { amount, categoryId, description } = await request.json();

        if (!amount || !categoryId) {
            return NextResponse.json({ error: 'Amount and category are required' }, { status: 400 });
        }

        const expenseId = createExpense(
            session.userId,
            parseFloat(amount),
            parseInt(categoryId),
            description || ''
        );

        return NextResponse.json({
            success: true,
            expenseId,
            message: 'Expense added successfully'
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
