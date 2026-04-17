export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getLocations, addLocation } from '@/lib/data';
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { retryWithBackoff } from '@/lib/utils';

export async function GET() {
  try {
    const locations = await getLocations();
    return NextResponse.json(locations);
  } catch (error) {
    console.error("[API GET /locations]", error);
    return NextResponse.json({ message: 'Erro ao buscar locais' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude } = await retryWithBackoff(() => geocodeAddress({ address: body.address }));

    const newLocationData = {
        ...body,
        latitude,
        longitude,
    };
    
    await addLocation(newLocationData);
    return NextResponse.json(newLocationData, { status: 201 });
  } catch (error) {
    console.error("[API POST /locations]", error);
    return NextResponse.json({ message: 'Erro ao adicionar local' }, { status: 500 });
  }
}
