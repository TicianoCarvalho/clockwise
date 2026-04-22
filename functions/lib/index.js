"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPunch = exports.syncUserClaims = exports.coraWebhook = exports.generateSubscriptionPix = void 0;
const functions = require("firebase-functions/v1"); // Força o uso da V1 para evitar conflitos
const admin = require("firebase-admin");
const axios_1 = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// --- CONFIGURAÇÃO CORA SEGURA ---
const getCoraClient = () => {
    const certPath = path.join(__dirname, "certs", "cora-cert.pem");
    const keyPath = path.join(__dirname, "certs", "cora-key.key");
    // Verifica se arquivos existem antes de ler para evitar timeout no deploy
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        return axios_1.default.create({ baseURL: "https://api.cora.com.br" });
    }
    const httpsAgent = new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    });
    return axios_1.default.create({
        baseURL: "https://api.cora.com.br",
        httpsAgent,
    });
};
/**
 * Cloud Function: Geração de QR Code Pix
 */
exports.generateSubscriptionPix = functions.https.onCall(async (data, context) => {
    // Agora o TypeScript entende 'context.auth'
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
    const { tenantId, amount } = data;
    try {
        const cora = getCoraClient();
        const response = await cora.post("/v1/pix/transfers", {
            amount: amount,
            external_id: tenantId,
            description: "Assinatura SaaS"
        });
        return {
            pixCopyPaste: response.data.emv,
            qrCodeUrl: response.data.qr_code_url
        };
    }
    catch (error) {
        console.error("Erro ao gerar Pix Cora:", error);
        throw new functions.https.HttpsError("internal", "Erro ao processar pagamento.");
    }
});
/**
 * Cloud Function: Webhook
 */
exports.coraWebhook = functions.https.onRequest(async (req, res) => {
    functions.logger.info("Webhook recebido da Cora", { signature: req.headers["cora-signature"] });
    const { event, data } = req.body;
    try {
        if (event === "transaction.created" && data.type === "CREDIT") {
            const tenantId = data.external_id;
            if (tenantId) {
                const tenantRef = db.collection("tenants").doc(tenantId);
                await tenantRef.update({
                    statusAssinatura: "pago",
                    dataExpiracao: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        res.status(200).send("OK");
    }
    catch (error) {
        res.status(500).send("Erro");
    }
});
/**
 * Cloud Function: Sincroniza Claims
 */
exports.syncUserClaims = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, _context) => {
    const userId = _context.params.userId;
    const afterData = change.after.data();
    const beforeData = change.before.data();
    if (!afterData)
        return null;
    if (beforeData && beforeData.role === afterData.role && beforeData.tenantId === afterData.tenantId) {
        return null;
    }
    const claims = { role: afterData.role };
    if (afterData.tenantId)
        claims.tenantId = afterData.tenantId;
    try {
        await admin.auth().setCustomUserClaims(userId, claims);
        return change.after.ref.set({ _lastClaimUpdate: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    catch (error) {
        return null;
    }
});
/**
 * Cloud Function: Processamento de Ponto
 */
exports.processPunch = functions.firestore
    .document("tenants/{tenantId}/punches/{punchId}")
    .onCreate(async (snap, context) => {
    const { tenantId } = context.params;
    functions.logger.info(`Ponto registrado no Tenant: ${tenantId}`, { id: snap.id });
    return null;
});
//# sourceMappingURL=index.js.map