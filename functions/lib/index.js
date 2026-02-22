"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paypalWebhook = exports.registerPayPalSubscription = exports.adminUpdateUserAccount = exports.provisionUser = exports.verifyMarketplacePaystackTransaction = exports.initializeMarketplacePaystackTransaction = exports.captureMarketplacePayPalOrder = exports.createMarketplacePayPalOrder = exports.retryExportJob = exports.processExportJobRetry = exports.processExportJob = exports.createExportJob = exports.incrementTemplateDownloads = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const functionsV1 = __importStar(require("firebase-functions/v1"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const crypto_1 = require("crypto");
const date_holidays_1 = __importDefault(require("date-holidays"));
const legacyRuntimeConfig = (() => {
    const namespace = functionsV1;
    if (typeof namespace.config === 'function') {
        try {
            return namespace.config();
        }
        catch {
            return undefined;
        }
    }
    return undefined;
})();
admin.initializeApp();
function normalizeEmail(value) {
    return (value || '').trim().toLowerCase();
}
function requireAuth(context) {
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functionsV1.https.HttpsError('unauthenticated', 'Authentication required');
    }
    return uid;
}
async function requireAdmin(context) {
    const uid = requireAuth(context);
    if (context.auth?.token?.admin === true)
        return uid;
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    const role = String(userSnap.data()?.role || '').trim().toLowerCase();
    if (role === 'admin')
        return uid;
    throw new functionsV1.https.HttpsError('permission-denied', 'Admin access required');
}
function getAdminEmail() {
    const fromEnv = normalizeEmail(process.env.ADMIN_EMAIL);
    if (fromEnv)
        return fromEnv;
    const fromConfig = normalizeEmail(legacyRuntimeConfig?.app?.admin_email);
    return fromConfig;
}
function getEnv(name) {
    return String(process.env[name] || '').trim();
}
function getPaypalMode() {
    const fromEnv = getEnv('PAYPAL_MODE');
    const fromConfig = String(legacyRuntimeConfig?.paypal?.mode || '').trim();
    const mode = (fromEnv || fromConfig || 'sandbox').toLowerCase();
    return mode === 'live' ? 'live' : 'sandbox';
}
function getPaypalClientId() {
    return getEnv('PAYPAL_CLIENT_ID') || String(legacyRuntimeConfig?.paypal?.client_id || '').trim();
}
function getPaypalClientSecret() {
    return getEnv('PAYPAL_CLIENT_SECRET') || String(legacyRuntimeConfig?.paypal?.client_secret || '').trim();
}
function getPaypalWebhookId() {
    return getEnv('PAYPAL_WEBHOOK_ID') || String(legacyRuntimeConfig?.paypal?.webhook_id || '').trim();
}
function getPaypalApiBaseUrl() {
    return getPaypalMode() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}
function getPaystackSecretKey() {
    return getEnv('PAYSTACK_SECRET_KEY') || String(legacyRuntimeConfig?.paystack?.secret_key || '').trim();
}
function getPaystackApiBaseUrl() {
    return 'https://api.paystack.co';
}
function getPlanIdEnv(key) {
    const paypalConfig = legacyRuntimeConfig?.paypal || {};
    return getEnv(key) || String(paypalConfig[key.toLowerCase()] || '').trim();
}
function mapPaypalPlanIdToTier(planId) {
    const id = String(planId || '').trim();
    if (!id)
        return null;
    const proMonthly = getPlanIdEnv('PAYPAL_PLAN_PRO_MONTHLY');
    const proYearly = getPlanIdEnv('PAYPAL_PLAN_PRO_YEARLY');
    const businessMonthly = getPlanIdEnv('PAYPAL_PLAN_BUSINESS_MONTHLY');
    const businessYearly = getPlanIdEnv('PAYPAL_PLAN_BUSINESS_YEARLY');
    if (proMonthly && id === proMonthly)
        return 'pro';
    if (proYearly && id === proYearly)
        return 'pro';
    if (businessMonthly && id === businessMonthly)
        return 'business';
    if (businessYearly && id === businessYearly)
        return 'business';
    return null;
}
function mapPaypalStatusToSubscriptionStatus(status) {
    const s = String(status || '').trim().toUpperCase();
    if (s === 'ACTIVE')
        return 'active';
    if (s === 'SUSPENDED')
        return 'past_due';
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'EXPIRED')
        return 'canceled';
    if (s === 'APPROVAL_PENDING')
        return 'incomplete';
    if (s === 'PENDING')
        return 'incomplete';
    return 'incomplete';
}
function coerceDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}
let paypalTokenCache = null;
async function getPaypalAccessToken() {
    const now = Date.now();
    if (paypalTokenCache && paypalTokenCache.expiresAtMs > now + 30000) {
        return paypalTokenCache.token;
    }
    const clientId = getPaypalClientId();
    const clientSecret = getPaypalClientSecret();
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
    }
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const url = `${getPaypalApiBaseUrl()}/v1/oauth2/token`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const json = (await resp.json());
    if (!resp.ok) {
        throw new Error(`PayPal token error: ${resp.status} ${JSON.stringify(json)}`);
    }
    const token = String(json?.access_token || '').trim();
    const expiresIn = Number(json?.expires_in || 0);
    if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new Error('PayPal token response invalid');
    }
    paypalTokenCache = {
        token,
        expiresAtMs: now + expiresIn * 1000,
    };
    return token;
}
async function paypalApiRequest(path, init = {}) {
    const token = await getPaypalAccessToken();
    const url = `${getPaypalApiBaseUrl()}${path}`;
    const resp = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });
    const text = await resp.text();
    const data = text ? JSON.parse(text) : {};
    if (!resp.ok) {
        throw new Error(`PayPal API error: ${resp.status} ${text || ''}`);
    }
    return data;
}
async function paystackApiRequest(path, init = {}) {
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
        throw new Error('Paystack secret key not configured');
    }
    const url = `${getPaystackApiBaseUrl()}${path}`;
    const resp = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });
    const text = await resp.text();
    const data = text ? JSON.parse(text) : {};
    if (!resp.ok) {
        throw new Error(`Paystack API error: ${resp.status} ${text || ''}`);
    }
    return data;
}
async function verifyPaypalWebhookSignature(input) {
    const webhookId = getPaypalWebhookId();
    if (!webhookId) {
        throw new Error('PayPal webhook ID not configured');
    }
    const h = input.headers;
    const transmissionId = String(h['paypal-transmission-id'] || '').trim();
    const transmissionTime = String(h['paypal-transmission-time'] || '').trim();
    const certUrl = String(h['paypal-cert-url'] || '').trim();
    const authAlgo = String(h['paypal-auth-algo'] || '').trim();
    const transmissionSig = String(h['paypal-transmission-sig'] || '').trim();
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
        return false;
    }
    const payload = {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: input.event,
    };
    const result = await paypalApiRequest('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return String(result?.verification_status || '').toUpperCase() === 'SUCCESS';
}
async function fetchPaypalSubscriptionDetails(subscriptionId) {
    const id = String(subscriptionId || '').trim();
    if (!id)
        throw new Error('Missing PayPal subscription id');
    return paypalApiRequest(`/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
        method: 'GET',
    });
}
async function updateUserTier(input) {
    const uid = String(input.userId || '').trim();
    if (!uid)
        return;
    await admin.firestore().collection('users').doc(uid).set({
        subscription: input.tier,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    try {
        const userRecord = await admin.auth().getUser(uid);
        const existing = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, {
            ...existing,
            subscription: input.tier,
        });
    }
    catch (e) {
        logger.warn('Failed to set subscription custom claim', { uid, error: e?.message || String(e) });
    }
}
async function updateUserRoleAndTier(input) {
    const uid = String(input.userId || '').trim();
    if (!uid) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'userId is required');
    }
    await admin.firestore().collection('users').doc(uid).set({
        role: input.role,
        subscription: input.subscription,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    const userRecord = await admin.auth().getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, {
        ...existingClaims,
        admin: input.role === 'admin',
        subscription: input.subscription,
    });
}
async function getMarketplaceTemplateById(templateId) {
    const id = String(templateId || '').trim();
    if (!id) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId is required');
    }
    const snap = await admin.firestore().collection('marketplace_templates').doc(id).get();
    if (!snap.exists) {
        throw new functionsV1.https.HttpsError('not-found', 'Template not found');
    }
    const data = (snap.data() || {});
    return { id, data };
}
async function createMarketplacePurchaseRecord(input) {
    const paymentId = (0, crypto_1.randomUUID)();
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userPurchaseRef = db.collection('users').doc(input.userId).collection('purchases').doc(input.templateId);
    const templatePurchaseRef = db.collection('marketplace_templates').doc(input.templateId).collection('purchases').doc(paymentId);
    const paymentRef = db.collection('marketplace_payments').doc(paymentId);
    await db.runTransaction(async (tx) => {
        const existing = await tx.get(userPurchaseRef);
        if (existing.exists)
            return;
        tx.set(userPurchaseRef, {
            templateId: input.templateId,
            userId: input.userId,
            provider: input.provider,
            providerReference: input.providerReference,
            amountPaid: input.amount,
            currency: input.currency,
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
        tx.set(templatePurchaseRef, {
            templateId: input.templateId,
            userId: input.userId,
            provider: input.provider,
            providerReference: input.providerReference,
            amountPaid: input.amount,
            currency: input.currency,
            createdAt: now,
            updatedAt: now,
        });
        tx.set(paymentRef, {
            id: paymentId,
            templateId: input.templateId,
            buyerId: input.userId,
            provider: input.provider,
            providerReference: input.providerReference,
            amount: input.amount,
            currency: input.currency,
            status: 'completed',
            createdAt: now,
            updatedAt: now,
        });
    });
    return paymentId;
}
async function createPayPalMarketplaceOrder(input) {
    const template = await getMarketplaceTemplateById(input.templateId);
    const amountCents = Number(template.data.price || 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Template does not require payment');
    }
    const amount = (amountCents / 100).toFixed(2);
    const body = {
        intent: 'CAPTURE',
        purchase_units: [
            {
                reference_id: `${input.templateId}:${input.userId}`,
                amount: {
                    currency_code: 'USD',
                    value: amount,
                },
                custom_id: JSON.stringify({ templateId: input.templateId, userId: input.userId }),
            },
        ],
    };
    const order = await paypalApiRequest('/v2/checkout/orders', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const orderId = String(order?.id || '').trim();
    if (!orderId) {
        throw new functionsV1.https.HttpsError('internal', 'Failed to create PayPal order');
    }
    return {
        orderId,
        amount: amountCents,
        currency: 'USD',
    };
}
async function capturePayPalMarketplaceOrder(input) {
    const template = await getMarketplaceTemplateById(input.templateId);
    const amountCents = Number(template.data.price || 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Template does not require payment');
    }
    const capture = await paypalApiRequest(`/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
        method: 'POST',
    });
    const status = String(capture?.status || '').trim();
    if (status !== 'COMPLETED') {
        throw new functionsV1.https.HttpsError('failed-precondition', 'PayPal payment not completed');
    }
    const providerReference = String(capture?.id || input.orderId).trim();
    const purchaseId = await createMarketplacePurchaseRecord({
        templateId: input.templateId,
        userId: input.userId,
        provider: 'paypal',
        providerReference,
        amount: amountCents,
        currency: 'USD',
    });
    return {
        purchaseId,
        status,
        providerReference,
    };
}
async function initializePaystackMarketplaceTransaction(input) {
    const template = await getMarketplaceTemplateById(input.templateId);
    const amountCents = Number(template.data.price || 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Template does not require payment');
    }
    const reference = `mkt_${input.templateId}_${input.userId}_${Date.now()}`;
    const payload = {
        email: input.email,
        amount: amountCents,
        currency: 'USD',
        reference,
        metadata: {
            templateId: input.templateId,
            userId: input.userId,
        },
    };
    const init = await paystackApiRequest('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const accessCode = String(init?.data?.access_code || '').trim();
    const responseReference = String(init?.data?.reference || reference).trim();
    if (!accessCode || !responseReference) {
        throw new functionsV1.https.HttpsError('internal', 'Failed to initialize Paystack transaction');
    }
    return { accessCode, reference: responseReference };
}
async function verifyPaystackMarketplaceTransaction(input) {
    const template = await getMarketplaceTemplateById(input.templateId);
    const amountCents = Number(template.data.price || 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Template does not require payment');
    }
    const reference = String(input.reference || '').trim();
    if (!reference) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'reference is required');
    }
    const verify = await paystackApiRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
    });
    const status = String(verify?.data?.status || '').trim();
    const paidAmount = Number(verify?.data?.amount || 0);
    const metadataTemplateId = String(verify?.data?.metadata?.templateId || '').trim();
    const metadataUserId = String(verify?.data?.metadata?.userId || '').trim();
    if (status !== 'success') {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Paystack payment not successful');
    }
    if (paidAmount !== amountCents) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Paystack amount mismatch');
    }
    if (metadataTemplateId && metadataTemplateId !== input.templateId) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Paystack template metadata mismatch');
    }
    if (metadataUserId && metadataUserId !== input.userId) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Paystack user metadata mismatch');
    }
    const providerReference = String(verify?.data?.reference || reference).trim();
    const purchaseId = await createMarketplacePurchaseRecord({
        templateId: input.templateId,
        userId: input.userId,
        provider: 'paystack',
        providerReference,
        amount: amountCents,
        currency: 'USD',
    });
    return {
        purchaseId,
        status,
        providerReference,
    };
}
exports.incrementTemplateDownloads = functionsV1.https.onCall(async (data, context) => {
    requireAuth(context);
    const templateId = String(data?.templateId || '').trim();
    if (!templateId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId is required');
    }
    const templateRef = admin.firestore().collection('marketplace_templates').doc(templateId);
    await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(templateRef);
        if (!snap.exists) {
            throw new functionsV1.https.HttpsError('not-found', 'Template not found');
        }
        tx.update(templateRef, {
            downloads: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
exports.createExportJob = functionsV1.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const projectId = String(data?.projectId || '').trim();
    if (!projectId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'projectId is required');
    }
    const projectSnap = await admin.firestore().collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
        throw new functionsV1.https.HttpsError('not-found', 'Project not found');
    }
    const project = projectSnap.data();
    if (!project || project.userId !== uid) {
        throw new functionsV1.https.HttpsError('permission-denied', 'You do not have access to this project');
    }
    const jobRef = admin.firestore().collection('exportJobs').doc();
    const job = {
        userId: uid,
        projectId,
        format: 'pdf',
        status: 'queued',
        progress: 0,
        attempts: 0,
        stage: 'queued',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await jobRef.set(job);
    logger.info('Created export job', { jobId: jobRef.id, uid, projectId });
    return { jobId: jobRef.id };
});
function clampInt(value, fallback, opts = {}) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n))
        return fallback;
    const rounded = Math.round(n);
    const min = opts.min ?? Number.NEGATIVE_INFINITY;
    const max = opts.max ?? Number.POSITIVE_INFINITY;
    return Math.min(max, Math.max(min, rounded));
}
function getExportJobMaxAttempts() {
    return clampInt(getEnv('EXPORT_JOB_MAX_ATTEMPTS'), 3, { min: 1, max: 10 });
}
async function claimExportJob(input) {
    const maxAttempts = getExportJobMaxAttempts();
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(input.jobRef);
        if (!snap.exists)
            return null;
        const job = snap.data();
        if (!job?.userId || !job?.projectId)
            return null;
        if (job.status !== 'queued') {
            return null;
        }
        const attempts = clampInt(job.attempts, 0, { min: 0, max: 999 });
        if (attempts >= maxAttempts) {
            tx.set(input.jobRef, {
                status: 'failed',
                stage: 'failed',
                progress: 100,
                error: { message: 'Max retry attempts exceeded' },
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return null;
        }
        const update = {
            status: 'running',
            stage: 'starting',
            progress: 5,
            attempts: attempts + 1,
            processingEventId: input.eventId,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(input.jobRef, update, { merge: true });
        return {
            userId: job.userId,
            projectId: job.projectId,
            format: (job.format || 'pdf'),
            status: 'running',
            progress: 5,
            attempts: attempts + 1,
            stage: 'starting',
            processingEventId: input.eventId,
            createdAt: job.createdAt,
            startedAt: update.startedAt,
        };
    });
}
function getMonthName(month) {
    const names = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];
    return names[month - 1] || `Month ${month}`;
}
function getLocalizedMonthYearTitle(input) {
    const language = String(input.language || '').trim() || 'en';
    try {
        const dtf = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' });
        return dtf.format(new Date(input.year, input.month - 1, 1));
    }
    catch {
        return `${getMonthName(input.month)} ${input.year}`;
    }
}
function getWeekdayLabels(startDay) {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const normalized = ((startDay % 7) + 7) % 7;
    return Array.from({ length: 7 }, (_, i) => labels[(normalized + i) % 7]);
}
function isWeekendColumn(startDay, columnIndex) {
    const normalized = ((startDay % 7) + 7) % 7;
    const dayOfWeek = (normalized + columnIndex) % 7;
    return dayOfWeek === 0 || dayOfWeek === 6;
}
function initHolidayLib(hd, countryRaw) {
    const normalized = countryRaw.trim().toUpperCase();
    if (!normalized)
        return false;
    const parts = normalized.split('-').filter(Boolean);
    try {
        if (parts.length === 1) {
            hd.init(parts[0]);
            return true;
        }
        if (parts.length === 2) {
            hd.init(parts[0], parts[1]);
            return true;
        }
        if (parts.length >= 3) {
            hd.init(parts[0], parts[1], parts[2]);
            return true;
        }
    }
    catch {
        return false;
    }
    return false;
}
function shortenLabel(value, maxLen) {
    const s = String(value || '').trim().replace(/\s+/g, ' ');
    if (!s)
        return '';
    if (s.length <= maxLen)
        return s;
    return s.slice(0, maxLen).trimEnd();
}
function getPublicHolidayMarkers(input) {
    const map = new Map();
    if (!input.enabled)
        return map;
    const country = String(input.country || '').trim();
    if (!country)
        return map;
    try {
        const hd = new date_holidays_1.default();
        const ok = initHolidayLib(hd, country);
        if (!ok)
            return map;
        const holidays = hd.getHolidays(input.year);
        for (const h of holidays) {
            const date = new Date(h.date);
            if (Number.isNaN(date.getTime()))
                continue;
            if (date.getFullYear() !== input.year)
                continue;
            if (date.getMonth() + 1 !== input.month)
                continue;
            const day = date.getDate();
            const label = String(h.name || h.localName || 'Holiday');
            if (!map.has(day)) {
                map.set(day, { label, color: '#dc2626' });
            }
        }
    }
    catch {
        return map;
    }
    return map;
}
async function getCustomHolidayMarkers(input) {
    const map = new Map();
    if (!input.enabled)
        return map;
    if (!input.userId)
        return map;
    function coerceDate(value) {
        if (!value)
            return null;
        if (value instanceof Date)
            return Number.isNaN(value.getTime()) ? null : value;
        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        if (typeof value === 'object') {
            const maybe = value;
            if (typeof maybe.toDate === 'function') {
                const d = maybe.toDate();
                return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
            }
        }
        return null;
    }
    try {
        const snap = await admin
            .firestore()
            .collection('users')
            .doc(input.userId)
            .collection('customHolidays')
            .get();
        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const parsed = coerceDate(data?.date);
            if (!parsed)
                continue;
            const name = String(data?.name || 'Custom');
            const color = typeof data?.color === 'string' && data.color.trim() ? String(data.color).trim() : '#2563eb';
            const recurrence = data?.recurrence;
            let instance = null;
            if (!recurrence) {
                instance = parsed;
            }
            else if (recurrence?.frequency === 'yearly') {
                instance = new Date(input.year, parsed.getMonth(), parsed.getDate());
            }
            if (!instance)
                continue;
            if (instance.getFullYear() !== input.year)
                continue;
            if (instance.getMonth() + 1 !== input.month)
                continue;
            if (recurrence?.endDate) {
                const end = coerceDate(recurrence.endDate);
                if (end && instance.getTime() > end.getTime()) {
                    continue;
                }
            }
            const day = instance.getDate();
            if (!map.has(day)) {
                map.set(day, { label: name, color });
            }
        }
    }
    catch {
        return map;
    }
    return map;
}
function getMonthGrid(params) {
    const { year, month, startDay } = params;
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDow = first.getDay(); // 0..6
    const offset = ((startDow - startDay) % 7 + 7) % 7;
    const totalCells = offset + daysInMonth;
    const rows = Math.max(5, Math.ceil(totalCells / 7));
    const grid = [];
    let day = 1;
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < 7; c++) {
            const cellIndex = r * 7 + c;
            if (cellIndex < offset || day > daysInMonth) {
                row.push(null);
            }
            else {
                row.push(day);
                day++;
            }
        }
        grid.push(row);
    }
    return grid;
}
function buildCalendarMonthPdfBuffer(input) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({ size: 'A4', margin: 48 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('error', (err) => reject(err));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = doc.page.margins.left;
            const contentWidth = pageWidth - margin - doc.page.margins.right;
            const contentHeight = pageHeight - doc.page.margins.top - doc.page.margins.bottom;
            // Header
            doc.fillColor('#111827');
            doc.fontSize(22).text(input.title, margin, margin, { width: contentWidth });
            doc
                .fontSize(16)
                .fillColor('#374151')
                .text(getLocalizedMonthYearTitle({ year: input.year, month: input.month, language: input.language }), {
                width: contentWidth,
            });
            const meta = input.metaLines?.filter(Boolean) ?? [];
            if (meta.length) {
                doc.moveDown(0.5);
                doc.fontSize(9).fillColor('#6b7280');
                meta.forEach((line) => doc.text(line, { width: contentWidth }));
            }
            // Grid geometry
            const topY = doc.y + 20;
            const gridX = margin;
            const gridWidth = contentWidth;
            const gridHeight = Math.min(420, contentHeight - (topY - margin) - 24);
            const headerHeight = 28;
            const rows = 6;
            const cols = 7;
            const cellWidth = gridWidth / cols;
            const cellHeight = (gridHeight - headerHeight) / rows;
            const holidayMarkers = input.holidayMarkers ??
                getPublicHolidayMarkers({
                    country: input.country,
                    year: input.year,
                    month: input.month,
                    enabled: Boolean(input.showHolidays),
                });
            // Outer border
            doc.save();
            doc.lineWidth(1);
            doc.strokeColor('#111827');
            doc.rect(gridX, topY, gridWidth, gridHeight).stroke();
            // Weekend shading (behind everything)
            doc.fillColor('#f8fafc');
            for (let c = 0; c < cols; c++) {
                if (!isWeekendColumn(input.startDay, c))
                    continue;
                const x = gridX + c * cellWidth;
                doc.rect(x, topY + headerHeight, cellWidth, gridHeight - headerHeight).fill();
            }
            // Header background
            doc.fillColor('#f3f4f6');
            doc.rect(gridX, topY, gridWidth, headerHeight).fill();
            // Header text
            const weekdayLabels = getWeekdayLabels(input.startDay);
            doc.fillColor('#111827').fontSize(10);
            for (let c = 0; c < cols; c++) {
                const x = gridX + c * cellWidth;
                doc.text(weekdayLabels[c] || '', x, topY + 8, {
                    width: cellWidth,
                    align: 'center',
                });
            }
            // Grid lines
            doc.strokeColor('#d1d5db').lineWidth(0.75);
            // Vertical lines
            for (let c = 1; c < cols; c++) {
                const x = gridX + c * cellWidth;
                doc.moveTo(x, topY);
                doc.lineTo(x, topY + gridHeight);
                doc.stroke();
            }
            // Horizontal lines
            doc.moveTo(gridX, topY + headerHeight);
            doc.lineTo(gridX + gridWidth, topY + headerHeight);
            doc.stroke();
            for (let r = 1; r < rows; r++) {
                const y = topY + headerHeight + r * cellHeight;
                doc.moveTo(gridX, y);
                doc.lineTo(gridX + gridWidth, y);
                doc.stroke();
            }
            // Day numbers
            const grid = getMonthGrid({ year: input.year, month: input.month, startDay: input.startDay });
            doc.fillColor('#111827').fontSize(11);
            for (let r = 0; r < rows; r++) {
                const row = grid[r] || [];
                for (let c = 0; c < cols; c++) {
                    const day = row[c];
                    if (!day)
                        continue;
                    const x = gridX + c * cellWidth;
                    const y = topY + headerHeight + r * cellHeight;
                    doc.text(String(day), x + 6, y + 6, {
                        width: cellWidth - 12,
                        align: 'right',
                    });
                    const marker = holidayMarkers.get(day);
                    if (marker) {
                        const dotX = x + 8;
                        const dotY = y + 12;
                        doc.save();
                        doc.fillColor(marker.color);
                        doc.circle(dotX, dotY, 3).fill();
                        const short = shortenLabel(marker.label, 12);
                        if (short) {
                            doc.fontSize(7);
                            doc.text(short, x + 14, y + 6, {
                                width: cellWidth - 20,
                                align: 'left',
                                ellipsis: true,
                            });
                        }
                        doc.restore();
                        doc.fillColor('#111827').fontSize(11);
                    }
                }
            }
            doc.restore();
            doc.end();
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.processExportJob = functionsV1.firestore
    .document('exportJobs/{jobId}')
    .onCreate(async (snap, context) => {
    const jobId = context.params.jobId;
    const jobRef = snap.ref;
    const claimed = await claimExportJob({ jobRef, eventId: String(context.eventId || jobId) });
    if (!claimed) {
        return;
    }
    const job = claimed;
    try {
        await jobRef.set({ stage: 'load_project', progress: 10 }, { merge: true });
        const projectSnap = await admin.firestore().collection('projects').doc(job.projectId).get();
        if (!projectSnap.exists) {
            throw new Error('Project not found');
        }
        const project = projectSnap.data();
        if (project?.userId !== job.userId) {
            throw new Error('Project ownership mismatch');
        }
        await jobRef.set({ stage: 'prepare_data', progress: 20 }, { merge: true });
        const projectName = String(project?.name || 'calendar');
        const year = clampInt(project?.config?.year, new Date().getFullYear(), { min: 1970, max: 3000 });
        const month = clampInt(project?.config?.currentMonth, new Date().getMonth() + 1, { min: 1, max: 12 });
        const startDay = clampInt(project?.config?.startDay, 0, { min: 0, max: 6 });
        const country = typeof project?.config?.country === 'string' ? project.config.country : undefined;
        const language = typeof project?.config?.language === 'string' ? String(project.config.language) : undefined;
        const showHolidays = project?.config?.showHolidays !== false;
        const showCustomHolidays = project?.config?.showCustomHolidays === true;
        const holidayMarkers = new Map();
        if (showHolidays) {
            const publicMarkers = getPublicHolidayMarkers({
                country,
                year,
                month,
                enabled: true,
            });
            for (const [day, marker] of publicMarkers.entries()) {
                holidayMarkers.set(day, marker);
            }
        }
        if (showCustomHolidays) {
            const customMarkers = await getCustomHolidayMarkers({
                userId: job.userId,
                year,
                month,
                enabled: true,
            });
            for (const [day, marker] of customMarkers.entries()) {
                // Let custom holidays override public ones on the same day.
                holidayMarkers.set(day, marker);
            }
        }
        await jobRef.set({ stage: 'render_pdf', progress: 40 }, { merge: true });
        const buffer = await buildCalendarMonthPdfBuffer({
            title: `Export: ${projectName}`,
            year,
            month,
            startDay,
            country,
            language,
            showHolidays,
            holidayMarkers,
            metaLines: [
                `Project ID: ${job.projectId}`,
                `User ID: ${job.userId}`,
                `Generated at: ${new Date().toISOString()}`,
            ],
        });
        await jobRef.set({ stage: 'upload', progress: 70 }, { merge: true });
        const bucket = admin.storage().bucket();
        const objectPath = `exports/${job.userId}/${jobId}/export.pdf`;
        const file = bucket.file(objectPath);
        const downloadToken = (0, crypto_1.randomUUID)();
        await file.save(buffer, {
            contentType: 'application/pdf',
            resumable: false,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken,
                },
            },
        });
        await jobRef.set({ stage: 'finalize', progress: 90 }, { merge: true });
        await jobRef.set({
            status: 'completed',
            stage: 'completed',
            progress: 100,
            output: {
                storagePath: objectPath,
                contentType: 'application/pdf',
            },
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info('Export job completed', { jobId, objectPath });
    }
    catch (e) {
        logger.error('Export job failed', { jobId, error: e?.message || String(e) });
        await jobRef.set({
            status: 'failed',
            stage: 'failed',
            progress: 100,
            error: {
                message: e?.message || 'Export failed',
            },
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
});
exports.processExportJobRetry = functionsV1.firestore
    .document('exportJobs/{jobId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    if (before?.status === after.status)
        return;
    if (after.status !== 'queued')
        return;
    const jobId = context.params.jobId;
    const jobRef = change.after.ref;
    const claimed = await claimExportJob({ jobRef, eventId: String(context.eventId || jobId) });
    if (!claimed)
        return;
    try {
        await jobRef.set({ stage: 'load_project', progress: 10 }, { merge: true });
        const projectSnap = await admin.firestore().collection('projects').doc(claimed.projectId).get();
        if (!projectSnap.exists) {
            throw new Error('Project not found');
        }
        const project = projectSnap.data();
        if (project?.userId !== claimed.userId) {
            throw new Error('Project ownership mismatch');
        }
        await jobRef.set({ stage: 'prepare_data', progress: 20 }, { merge: true });
        const projectName = String(project?.name || 'calendar');
        const year = clampInt(project?.config?.year, new Date().getFullYear(), { min: 1970, max: 3000 });
        const month = clampInt(project?.config?.currentMonth, new Date().getMonth() + 1, { min: 1, max: 12 });
        const startDay = clampInt(project?.config?.startDay, 0, { min: 0, max: 6 });
        const country = typeof project?.config?.country === 'string' ? project.config.country : undefined;
        const language = typeof project?.config?.language === 'string' ? String(project.config.language) : undefined;
        const showHolidays = project?.config?.showHolidays !== false;
        const showCustomHolidays = project?.config?.showCustomHolidays === true;
        const holidayMarkers = new Map();
        if (showHolidays) {
            const publicMarkers = getPublicHolidayMarkers({
                country,
                year,
                month,
                enabled: true,
            });
            for (const [day, marker] of publicMarkers.entries()) {
                holidayMarkers.set(day, marker);
            }
        }
        if (showCustomHolidays) {
            const customMarkers = await getCustomHolidayMarkers({
                userId: claimed.userId,
                year,
                month,
                enabled: true,
            });
            for (const [day, marker] of customMarkers.entries()) {
                holidayMarkers.set(day, marker);
            }
        }
        await jobRef.set({ stage: 'render_pdf', progress: 40 }, { merge: true });
        const buffer = await buildCalendarMonthPdfBuffer({
            title: `Export: ${projectName}`,
            year,
            month,
            startDay,
            country,
            language,
            showHolidays,
            holidayMarkers,
            metaLines: [
                `Project ID: ${claimed.projectId}`,
                `User ID: ${claimed.userId}`,
                `Generated at: ${new Date().toISOString()}`,
            ],
        });
        await jobRef.set({ stage: 'upload', progress: 70 }, { merge: true });
        const bucket = admin.storage().bucket();
        const objectPath = `exports/${claimed.userId}/${jobId}/export.pdf`;
        const file = bucket.file(objectPath);
        const downloadToken = (0, crypto_1.randomUUID)();
        await file.save(buffer, {
            contentType: 'application/pdf',
            resumable: false,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken,
                },
            },
        });
        await jobRef.set({ stage: 'finalize', progress: 90 }, { merge: true });
        await jobRef.set({
            status: 'completed',
            stage: 'completed',
            progress: 100,
            output: {
                storagePath: objectPath,
                contentType: 'application/pdf',
            },
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (e) {
        logger.error('Export job retry failed', { jobId, error: e?.message || String(e) });
        await jobRef.set({
            status: 'failed',
            stage: 'failed',
            progress: 100,
            error: {
                message: e?.message || 'Export failed',
            },
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
});
exports.retryExportJob = functionsV1.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const jobId = String(data?.jobId || '').trim();
    if (!jobId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'jobId is required');
    }
    const jobRef = admin.firestore().collection('exportJobs').doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) {
        throw new functionsV1.https.HttpsError('not-found', 'Export job not found');
    }
    const job = snap.data();
    if (!job?.userId) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Export job is invalid');
    }
    const isAdmin = context.auth?.token?.admin === true;
    if (!isAdmin && job.userId !== uid) {
        throw new functionsV1.https.HttpsError('permission-denied', 'Not allowed to retry this export job');
    }
    if (job.status === 'running') {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Export job is already running');
    }
    await jobRef.set({
        status: 'queued',
        stage: 'queued',
        progress: 0,
        error: admin.firestore.FieldValue.delete(),
        output: admin.firestore.FieldValue.delete(),
        completedAt: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    return { ok: true };
});
exports.createMarketplacePayPalOrder = functionsV1.https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const templateId = String(data?.templateId || '').trim();
    if (!templateId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId is required');
    }
    const order = await createPayPalMarketplaceOrder({ templateId, userId });
    return {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
    };
});
exports.captureMarketplacePayPalOrder = functionsV1.https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const templateId = String(data?.templateId || '').trim();
    const orderId = String(data?.orderId || '').trim();
    if (!templateId || !orderId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId and orderId are required');
    }
    const capture = await capturePayPalMarketplaceOrder({
        templateId,
        userId,
        orderId,
    });
    return {
        ok: true,
        purchaseId: capture.purchaseId,
        status: capture.status,
        providerReference: capture.providerReference,
    };
});
exports.initializeMarketplacePaystackTransaction = functionsV1.https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const templateId = String(data?.templateId || '').trim();
    const email = String(context.auth?.token?.email || '').trim();
    if (!templateId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId is required');
    }
    if (!email) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Authenticated email is required for Paystack checkout');
    }
    const initialized = await initializePaystackMarketplaceTransaction({ templateId, userId, email });
    return {
        accessCode: initialized.accessCode,
        reference: initialized.reference,
    };
});
exports.verifyMarketplacePaystackTransaction = functionsV1.https.onCall(async (data, context) => {
    const userId = requireAuth(context);
    const templateId = String(data?.templateId || '').trim();
    const reference = String(data?.reference || '').trim();
    if (!templateId || !reference) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'templateId and reference are required');
    }
    const verified = await verifyPaystackMarketplaceTransaction({
        templateId,
        userId,
        reference,
    });
    return {
        ok: true,
        purchaseId: verified.purchaseId,
        status: verified.status,
        providerReference: verified.providerReference,
    };
});
exports.provisionUser = functionsV1.auth.user().onCreate(async (user) => {
    const email = normalizeEmail(user.email);
    const adminEmail = getAdminEmail();
    const isAdmin = Boolean(email && adminEmail && email === adminEmail);
    const displayName = user.displayName || (email ? email.split('@')[0] : 'User');
    logger.info('Provisioning user', {
        uid: user.uid,
        email,
        isAdmin,
    });
    if (isAdmin) {
        const userRecord = await admin.auth().getUser(user.uid);
        const existingClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(user.uid, {
            ...existingClaims,
            admin: true,
        });
    }
    const now = new Date().toISOString();
    await admin
        .firestore()
        .collection('users')
        .doc(user.uid)
        .set({
        email: user.email || '',
        displayName,
        photoURL: user.photoURL || null,
        role: isAdmin ? 'admin' : 'user',
        subscription: isAdmin ? 'enterprise' : 'free',
        preferences: {
            theme: 'system',
            language: 'en',
            defaultCountry: 'KE',
            emailNotifications: true,
            marketingEmails: false,
        },
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
    }, { merge: true });
});
exports.adminUpdateUserAccount = functionsV1.https.onCall(async (data, context) => {
    await requireAdmin(context);
    const userId = String(data?.userId || '').trim();
    const role = String(data?.role || '').trim().toLowerCase();
    const subscription = String(data?.subscription || '').trim().toLowerCase();
    if (!userId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'userId is required');
    }
    const allowedRoles = ['user', 'creator', 'admin'];
    const allowedSubscriptions = ['free', 'pro', 'business', 'enterprise'];
    if (!allowedRoles.includes(role)) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Invalid role');
    }
    if (!allowedSubscriptions.includes(subscription)) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Invalid subscription tier');
    }
    await updateUserRoleAndTier({
        userId,
        role: role,
        subscription: subscription,
    });
    return {
        ok: true,
        userId,
        role,
        subscription,
    };
});
exports.registerPayPalSubscription = functionsV1.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const subscriptionId = String(data?.paypalSubscriptionId || '').trim();
    if (!subscriptionId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'paypalSubscriptionId is required');
    }
    let details;
    try {
        details = await fetchPaypalSubscriptionDetails(subscriptionId);
    }
    catch (e) {
        logger.warn('Failed to fetch PayPal subscription details during registration', {
            uid,
            subscriptionId,
            error: e?.message || String(e),
        });
        throw new functionsV1.https.HttpsError('failed-precondition', 'Unable to validate PayPal subscription');
    }
    const paypalPlanId = String(details?.plan_id || '').trim();
    const tier = mapPaypalPlanIdToTier(paypalPlanId);
    if (!tier) {
        throw new functionsV1.https.HttpsError('failed-precondition', 'Unknown PayPal plan');
    }
    const status = mapPaypalStatusToSubscriptionStatus(details?.status);
    const start = coerceDate(details?.start_time);
    const nextBilling = coerceDate(details?.billing_info?.next_billing_time);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const subRef = admin.firestore().collection('subscriptions').doc(subscriptionId);
    const existing = await subRef.get();
    const docToSave = {
        userId: uid,
        tier,
        status,
        paypalCustomerId: String(details?.subscriber?.payer_id || '').trim() || undefined,
        paypalSubscriptionId: subscriptionId,
        paypalPlanId,
        currentPeriodStart: start ? admin.firestore.Timestamp.fromDate(start) : undefined,
        currentPeriodEnd: nextBilling ? admin.firestore.Timestamp.fromDate(nextBilling) : undefined,
        cancelAtPeriodEnd: Boolean(details?.status === 'CANCELLED' || details?.status === 'CANCELED'),
        updatedAt: now,
    };
    if (!existing.exists) {
        docToSave.createdAt = now;
    }
    await subRef.set(docToSave, { merge: true });
    if (status === 'active') {
        await updateUserTier({ userId: uid, tier });
    }
    return { ok: true, tier, status };
});
exports.paypalWebhook = functionsV1.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const raw = req.rawBody;
    let event = null;
    try {
        if (raw && Buffer.isBuffer(raw)) {
            event = JSON.parse(raw.toString('utf8'));
        }
        else {
            event = req.body;
        }
    }
    catch {
        res.status(400).send('Invalid JSON');
        return;
    }
    try {
        const ok = await verifyPaypalWebhookSignature({
            headers: req.headers,
            event,
        });
        if (!ok) {
            logger.warn('PayPal webhook signature verification failed');
            res.status(400).send('Invalid signature');
            return;
        }
    }
    catch (e) {
        logger.error('PayPal webhook verification error', { error: e?.message || String(e) });
        res.status(500).send('Verification error');
        return;
    }
    const eventType = String(event?.event_type || '').trim();
    const resource = event?.resource || null;
    const subscriptionId = String(resource?.id || '').trim();
    if (!subscriptionId) {
        res.status(200).send('No subscription id');
        return;
    }
    try {
        const subRef = admin.firestore().collection('subscriptions').doc(subscriptionId);
        const subSnap = await subRef.get();
        if (!subSnap.exists) {
            logger.warn('PayPal webhook for unknown subscription', { subscriptionId, eventType });
            res.status(200).send('No matching subscription');
            return;
        }
        const existing = subSnap.data();
        const userId = String(existing?.userId || '').trim();
        if (!userId) {
            logger.warn('Subscription doc missing userId', { subscriptionId });
            res.status(200).send('Missing user');
            return;
        }
        let details = null;
        try {
            details = await fetchPaypalSubscriptionDetails(subscriptionId);
        }
        catch (e) {
            logger.warn('Failed to refresh PayPal subscription details', { subscriptionId, error: e?.message || String(e) });
        }
        const paypalPlanId = String(details?.plan_id || resource?.plan_id || existing?.paypalPlanId || '').trim();
        const tier = mapPaypalPlanIdToTier(paypalPlanId) || existing?.tier || 'free';
        const status = mapPaypalStatusToSubscriptionStatus(details?.status || resource?.status);
        const start = coerceDate(details?.start_time || resource?.start_time);
        const nextBilling = coerceDate(details?.billing_info?.next_billing_time || resource?.billing_info?.next_billing_time);
        const update = {
            tier,
            status,
            paypalPlanId,
            paypalCustomerId: String(details?.subscriber?.payer_id || resource?.subscriber?.payer_id || existing?.paypalCustomerId || '').trim() || undefined,
            currentPeriodStart: start ? admin.firestore.Timestamp.fromDate(start) : undefined,
            currentPeriodEnd: nextBilling ? admin.firestore.Timestamp.fromDate(nextBilling) : undefined,
            cancelAtPeriodEnd: Boolean(details?.status === 'CANCELLED' || details?.status === 'CANCELED'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await subRef.set(update, { merge: true });
        const userTier = status === 'active' ? tier : 'free';
        await updateUserTier({ userId, tier: userTier });
        logger.info('Processed PayPal webhook', { subscriptionId, eventType, status, tier: userTier });
        res.status(200).send('OK');
    }
    catch (e) {
        logger.error('PayPal webhook handler error', { error: e?.message || String(e) });
        res.status(500).send('Handler error');
    }
});
