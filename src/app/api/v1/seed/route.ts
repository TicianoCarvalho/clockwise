export const dynamic = 'force-dynamic'; // <--- ADICIONE ESTA LINHA
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Helper to check if a collection is empty
async function isCollectionEmpty(collectionPath: string): Promise<boolean> {
    const snapshot = await adminDb.collection(collectionPath).limit(1).get();
    return snapshot.empty;
}

export async function POST(request: Request) {
    // --- Basic Security ---
    // Verify the caller's token to ensure they are a master admin.
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ message: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (decodedToken.role !== 'master') {
             return NextResponse.json({ message: 'Forbidden: Only master admins can seed data.' }, { status: 403 });
        }
    } catch (error) {
         return NextResponse.json({ message: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const batch = adminDb.batch();
    
    try {
        // --- 1. Seed Global Data (Schedules, Sectors, Scales) if they are empty ---
        const scheduleId1 = `sched-${uuidv4().substring(0, 8)}`;
        const scheduleId2 = `sched-${uuidv4().substring(0, 8)}`;
        
        if (await isCollectionEmpty('schedules')) {
            console.log("Seeding global schedules...");
            const schedule1Ref = adminDb.collection('schedules').doc();
            batch.set(schedule1Ref, {
                name: "Padrão (9h-18h)",
                automaticInterval: false,
                workWeek: [
                    { dayOfWeek: 1, name: 'Segunda', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
                    { dayOfWeek: 2, name: 'Terça', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
                    { dayOfWeek: 3, name: 'Quarta', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
                    { dayOfWeek: 4, name: 'Quinta', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
                    { dayOfWeek: 5, name: 'Sexta', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '17:00' },
                    { dayOfWeek: 6, name: 'Sábado', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
                    { dayOfWeek: 0, name: 'Domingo', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
                ]
            });
             const schedule2Ref = adminDb.collection('schedules').doc();
             batch.set(schedule2Ref, {
                name: "Meio Período (Manhã)",
                automaticInterval: false,
                workWeek: [
                     { dayOfWeek: 1, name: 'Segunda', isDayOff: false, entry1: '08:00', exit1: '12:00', entry2: '', exit2: '' },
                     { dayOfWeek: 2, name: 'Terça', isDayOff: false, entry1: '08:00', exit1: '12:00', entry2: '', exit2: '' },
                     { dayOfWeek: 3, name: 'Quarta', isDayOff: false, entry1: '08:00', exit1: '12:00', entry2: '', exit2: '' },
                     { dayOfWeek: 4, name: 'Quinta', isDayOff: false, entry1: '08:00', exit1: '12:00', entry2: '', exit2: '' },
                     { dayOfWeek: 5, name: 'Sexta', isDayOff: false, entry1: '08:00', exit1: '12:00', entry2: '', exit2: '' },
                     { dayOfWeek: 6, name: 'Sábado', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
                     { dayOfWeek: 0, name: 'Domingo', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
                ]
            });
        }
        
        if (await isCollectionEmpty('sectors')) {
            console.log("Seeding global sectors...");
            batch.set(adminDb.collection('sectors').doc(), { name: "Administrativo", description: "Setor administrativo e financeiro." });
            batch.set(adminDb.collection('sectors').doc(), { name: "Operacional", description: "Setor de operações e produção." });
        }
        
        // --- 2. Create a new Test Tenant ---
        const tenantId = `test-${uuidv4().substring(0, 8)}`;
        const tenantRef = adminDb.collection('tenants').doc(tenantId);
        console.log(`Creating test tenant with ID: ${tenantId}`);
        batch.set(tenantRef, {
            id: tenantId,
            name: "Empresa Teste (Gerada via API)",
            cnpj: "99.999.999/0001-99",
            address: "Avenida dos Testes, 456",
            city: "Demo City",
            state: "DS",
            plan: "prime",
            status: "Ativa",
            paymentStatus: "Em dia",
            paymentDay: 15
        });

        // --- 3. Create 3 Fictitious Employees for this Tenant ---
        const employeesData = [
            { matricula: "101", name: "Alice Braga", cpf: "111.111.111-11", role: "Analista", setor: "Administrativo", scheduleId: scheduleId1 },
            { matricula: "102", name: "Bruno Costa", cpf: "222.222.222-22", role: "Vendedor", setor: "Vendas", scheduleId: scheduleId1 },
            { matricula: "103", name: "Carla Dias", cpf: "333.333.333-33", role: "Operadora", setor: "Operacional", scheduleId: scheduleId2 },
        ];
        
        console.log("Creating 3 fictitious employees...");
        for (const emp of employeesData) {
            const employeeRef = tenantRef.collection('employees').doc(emp.cpf); // Use CPF as ID
            batch.set(employeeRef, {
                ...emp,
                id: emp.cpf, // Save ID also as a field for compatibility
                email: `${emp.name.split(' ')[0].toLowerCase()}@${tenantId}.com`,
                celular: "(00) 90000-0000",
                localTrabalho: "Sede Principal",
                status: "Ativo",
            });
        }
        
        await batch.commit();
        
        return NextResponse.json({ 
            message: "Seed data created successfully!",
            tenantId: tenantId,
        }, { status: 201 });

    } catch (error: any) {
        console.error("Error seeding database:", error);
        return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
    }
}
