"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPunch = exports.syncUserClaims = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicializa o SDK sem duplicar se já estiver rodando
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Cloud Function: Sincroniza Claims do Usuário
 * Garante que o tenantId e o role estejam no Token de Autenticação.
 */
exports.syncUserClaims = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
    const { userId } = context.params;
    const afterData = change.after.data();
    const beforeData = change.before.data();
    // 1. Caso de Deleção
    if (!afterData) {
        console.log(`Usuário ${userId} deletado. Claims expirarão com o token.`);
        return null;
    }
    // 2. Evitar execuções desnecessárias (Otimização de custo)
    if (beforeData &&
        beforeData.role === afterData.role &&
        beforeData.tenantId === afterData.tenantId) {
        return null;
    }
    // 3. Validação de Dados
    if (!afterData.role) {
        console.error(`Erro: Role ausente para o usuário ${userId}`);
        return null;
    }
    // 4. Montagem dos Claims
    const claims = {
        role: afterData.role,
    };
    if (afterData.tenantId) {
        claims.tenantId = afterData.tenantId;
    }
    // Segurança: Bloqueia não-masters sem TenantId
    if (afterData.role !== "master" && !afterData.tenantId) {
        console.error(`Erro: Usuário ${userId} sem tenantId vinculado.`);
        return null;
    }
    try {
        await admin.auth().setCustomUserClaims(userId, claims);
        console.log(`Claims definidos para ${userId}:`, claims);
        // Forçar atualização do timestamp no doc para o front-end saber que mudou
        return change.after.ref.set({
            _lastClaimUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    catch (error) {
        console.error(`Erro ao definir claims para ${userId}:`, error);
        return null;
    }
});
/**
 * Cloud Function: Processamento de Batida de Ponto
 * Acionada quando um funcionário bate o ponto via API segura.
 */
exports.processPunch = functions.firestore
    .document("tenants/{tenantId}/punches/{punchId}")
    .onCreate(async (snap, context) => {
    const newPunch = snap.data();
    const { tenantId, punchId } = context.params;
    // Log estruturado para auditoria
    functions.logger.info(`Processando Ponto: [${punchId}] | Empresa: [${tenantId}]`, {
        employeeId: newPunch.employeeId,
        timestamp: newPunch.timestamp
    });
    // Aqui entrará a lógica de cálculo de horas (Regra de Negócio)
    // 1. Buscar escala do funcionário
    // 2. Calcular atrasos/horas extras
    // 3. Atualizar o resumo mensal do funcionário
    return null;
});
//# sourceMappingURL=index.js.map