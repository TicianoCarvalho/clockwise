export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// The GET and POST endpoints have been removed as the client now interacts directly with Firestore.
// This file is kept to prevent breaking changes in case other parts of the app still reference it,
// but it should be removed in a future cleanup.

export async function POST(request: Request) {
    console.error("[API POST /users] This endpoint is deprecated. Use Firestore directly.");
    return NextResponse.json({ message: 'This endpoint is deprecated and should not be used.' }, { status: 410 });
}
