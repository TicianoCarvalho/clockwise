export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { addClockPunch, getEmployeeById, getPunchesForEmployee, getLocations, type Location } from '@/lib/data';
import { format } from 'date-fns';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d;
}


export async function POST(request: Request) {
  try {
    const { employeeId, timestamp, latitude, longitude } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ message: 'ID do funcionário é obrigatório' }, { status: 400 });
    }

    const employee = await getEmployeeById(employeeId);
    if (!employee) {
        return NextResponse.json({ message: 'Funcionário não encontrado' }, { status: 404 });
    }

    const punches = await getPunchesForEmployee(employee.matricula);
    const nowString = timestamp || format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const nowForComparison = new Date(nowString);

    const lastPunch = punches.length > 0 ? punches[punches.length - 1] : null;
    if (lastPunch && (nowForComparison.getTime() - new Date(lastPunch.timestamp).getTime()) < 300000) { // 5 minute threshold
        console.warn(`[API /punches] Ponto duplicado ignorado para ${employee.name} (dentro de 5min).`);
        const punchType = lastPunch.type;
        return NextResponse.json({ message: 'Ponto já registrado recentemente.', punchType }, { status: 200 });
    }
    
    const punchesToday = punches.filter(p => p.timestamp.substring(0, 10) === nowString.substring(0, 10));
    
    const punchMap = ['Entrada', 'SaidaAlmoco', 'EntradaAlmoco', 'Saída'];
    const punchIndex = punchesToday.length;
    const punchType = punchIndex < 4 ? punchMap[punchIndex] : 'Saída';

    // Location Anomaly Check
    let isLocationAnomaly = false;
    if (latitude && longitude && employee.localTrabalho) {
        const locations = await getLocations();
        const workLocation = locations.find(loc => loc.name === employee.localTrabalho);
        if (workLocation && workLocation.latitude && workLocation.longitude) {
            const distance = getDistance(latitude, longitude, workLocation.latitude, workLocation.longitude);
            if (distance > 200) { // 200 meters tolerance
                isLocationAnomaly = true;
            }
        }
    }

    await addClockPunch({
      employeeId: employee.matricula,
      type: punchType as any,
      location: { latitude: 0, longitude: 0 }, // Kept for legacy, but we use the new fields
      locationName: employee.localTrabalho,
      timestamp: nowString,
      isLocationAnomaly,
      actualLatitude: latitude,
      actualLongitude: longitude
    });

    return NextResponse.json({ message: 'Ponto registrado com sucesso', punchType }, { status: 201 });
  } catch (error) {
    console.error("[API POST /punches]", error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
