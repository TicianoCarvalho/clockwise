export const dynamic = 'force-dynamic'; 
import { NextRequest, NextResponse } from 'next/server'; // Adicionado NextRequest
import { z } from 'zod';
// Importamos o addClockPunch para salvar no banco em vez de arquivo JSON
import { getAllPunches, getEmployees, updateDeviceLastSeen, addClockPunch } from '@/lib/data';

const logSchema = z.object({
  enrollid: z.union([z.string(), z.number()]),
  time: z.string(), 
});

const sendLogSchema = z.object({
  cmd: z.literal('send log'),
  sn: z.string(),
  record: z.array(logSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = sendLogSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Dados de log inválidos' }, { status: 400 });
    }

    const { sn, record } = validation.data;
    
    // IMPORTANTE: Como os relógios enviam logs via API, precisamos definir qual cliente (tenant) esse relógio pertence.
    // Se o sn (Serial Number) for único por cliente, você deve buscar o tenantId associado ao sn.
    // Por enquanto, usaremos um placeholder. Substitua pela lógica de busca do tenant.
    const tenantId = "DEFAULT_TENANT"; 

    const allPunches = await getAllPunches(tenantId);
    const allEmployees = await getEmployees(tenantId);
    
    const sortedRecord = record.sort((a,b) => a.time.localeCompare(b.time));

    for (const rec of sortedRecord) {
        const employeeIdString = String(rec.enrollid);
        const employee = allEmployees.find(e => 
          String(e.id) === employeeIdString || String(e.matricula) === employeeIdString
        );

        if (!employee) {
            console.warn(`[API clock-events] Log para enrollid ${rec.enrollid} ignorado.`);
            continue;
        }
        
        const timestamp = rec.time; 
        const punchDateStr = timestamp.substring(0, 10);
        
        const punchesToday = allPunches.filter(p => 
            p.employeeId === employee.matricula && 
            p.timestamp.substring(0, 10) === punchDateStr
        );

        const punchMap = ['Entrada', 'SaidaAlmoco', 'EntradaAlmoco', 'Saída'];
        const punchType = punchesToday.length < 4 ? punchMap[punchesToday.length] : 'Saída';

        const isDuplicate = allPunches.some(p => 
            p.employeeId === employee.matricula && 
            p.timestamp === timestamp
        );
        
        if (!isDuplicate) {
            // SALVAMENTO REAL NO FIRESTORE
            await addClockPunch({
                deviceId: sn,
                employeeId: employee.matricula,
                type: punchType as any,
                locationName: (employee as any).localTrabalho || 'Relógio Biométrico',
                timestamp: timestamp,
                tenantId: tenantId // Adicionado para isolamento de dados
            });
            console.log(`[API clock-events] Ponto Salvo: ${employee.name}, Tipo: ${punchType}`);
        }
    }

    // Atualiza status do dispositivo
    await updateDeviceLastSeen(sn); 

    return NextResponse.json({ message: "Logs processados com sucesso!" }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [API clock-events] Erro ao processar logs:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}