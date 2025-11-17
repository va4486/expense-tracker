import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCategories, createCategory } from '@/lib/db';

export async function GET(request: NextRequest) {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = getCategories(session.userId);
    return NextResponse.json({ categories });
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
        const { name, type, parentId } = await request.json();

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
        }

        if (type !== 'essential' && type !== 'non-essential') {
            return NextResponse.json({ error: 'Type must be essential or non-essential' }, { status: 400 });
        }

        const categoryId = createCategory(
            session.userId,
            name,
            type,
            parentId ? parseInt(parentId) : null
        );

        return NextResponse.json({
            success: true,
            categoryId,
            message: 'Category created successfully'
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}
