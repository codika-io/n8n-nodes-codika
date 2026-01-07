"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionCallbackDescription = void 0;
exports.executeIngestionCallback = executeIngestionCallback;
const n8n_workflow_1 = require("n8n-workflow");
function tryGetIngestionData(context, itemIndex = 0) {
    var _a;
    try {
        const proxy = context.getWorkflowDataProxy(itemIndex);
        const customData = (_a = proxy.$execution) === null || _a === void 0 ? void 0 : _a.customData;
        if (customData) {
            const docId = customData.get('codikaDocId');
            const callbackUrl = customData.get('codikaCallbackUrl');
            const embeddingSecret = customData.get('codikaEmbeddingSecret');
            const startTimeMs = customData.get('codikaStartTimeMs');
            const processId = customData.get('codikaProcessId');
            const dataIngestionId = customData.get('codikaDataIngestionId');
            if (docId && callbackUrl && embeddingSecret) {
                return {
                    docId,
                    callbackUrl,
                    embeddingSecret,
                    processId: processId || '',
                    dataIngestionId: dataIngestionId || '',
                    startTimeMs: startTimeMs ? parseInt(startTimeMs, 10) : 0,
                };
            }
        }
    }
    catch {
    }
    try {
        const expression = "$('Codika').first().json";
        const result = context.evaluateExpression(expression, itemIndex);
        if ((result === null || result === void 0 ? void 0 : result.docId) && (result === null || result === void 0 ? void 0 : result.callbackUrl) && (result === null || result === void 0 ? void 0 : result.embeddingSecret)) {
            return {
                docId: result.docId,
                callbackUrl: result.callbackUrl,
                embeddingSecret: result.embeddingSecret,
                processId: result.processId || '',
                dataIngestionId: result.dataIngestionId || '',
                startTimeMs: result._startTimeMs || 0,
            };
        }
    }
    catch {
    }
    return null;
}
const displayOptions = {
    show: {
        resource: ['dataIngestion'],
        operation: ['ingestionCallback'],
    },
};
exports.ingestionCallbackDescription = [
    {
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions,
        description: 'Callback parameters (doc_id, callback_url, embedding_secret) are auto-detected from the "Codika (Init Data Ingestion)" operation. Only configure status and extracted_tags.',
    },
    {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        required: true,
        default: 'success',
        displayOptions,
        options: [
            {
                name: 'Success',
                value: 'success',
                description: 'Document was successfully embedded',
            },
            {
                name: 'Failed',
                value: 'failed',
                description: 'Document embedding failed',
            },
            {
                name: 'Skipped',
                value: 'skipped',
                description: 'Document was skipped (duplicate/unchanged)',
            },
        ],
        description: 'The status of the data ingestion operation',
    },
    {
        displayName: 'Extracted Tags',
        name: 'extractedTags',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: '={{ $json.finalTags }}',
        description: 'Comma-separated list of tags extracted from the document, or use expression to pass array',
    },
    {
        displayName: 'Skip Reason',
        name: 'skipReason',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['dataIngestion'],
                operation: ['ingestionCallback'],
                status: ['skipped'],
            },
        },
        placeholder: 'e.g., Content unchanged (hash match)',
        description: 'Reason why the document was skipped',
    },
    {
        displayName: 'Error Message',
        name: 'errorMessage',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['dataIngestion'],
                operation: ['ingestionCallback'],
                status: ['failed'],
            },
        },
        placeholder: 'e.g., Failed to generate embeddings',
        description: 'Error message if ingestion failed',
    },
    {
        displayName: 'Doc ID',
        name: 'docId',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: 'Auto-detected from Init node',
        description: 'Leave empty to auto-detect. Manual override for document ID.',
    },
    {
        displayName: 'Callback URL',
        name: 'callbackUrl',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: 'Auto-detected from Init node',
        description: 'Leave empty to auto-detect. Manual override for callback URL.',
    },
    {
        displayName: 'Embedding Secret',
        name: 'embeddingSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions,
        placeholder: 'Auto-detected from Init node',
        description: 'Leave empty to auto-detect. Manual override for embedding secret.',
    },
];
async function executeIngestionCallback() {
    const returnData = [];
    const autoData = tryGetIngestionData(this);
    const manualDocId = this.getNodeParameter('docId', 0, '');
    const manualCallbackUrl = this.getNodeParameter('callbackUrl', 0, '');
    const manualEmbeddingSecret = this.getNodeParameter('embeddingSecret', 0, '');
    const status = this.getNodeParameter('status', 0, 'success');
    const extractedTagsRaw = this.getNodeParameter('extractedTags', 0, '');
    const docId = manualDocId || (autoData === null || autoData === void 0 ? void 0 : autoData.docId) || '';
    const callbackUrl = manualCallbackUrl || (autoData === null || autoData === void 0 ? void 0 : autoData.callbackUrl) || '';
    const embeddingSecret = manualEmbeddingSecret || (autoData === null || autoData === void 0 ? void 0 : autoData.embeddingSecret) || '';
    const processId = (autoData === null || autoData === void 0 ? void 0 : autoData.processId) || '';
    const dataIngestionId = (autoData === null || autoData === void 0 ? void 0 : autoData.dataIngestionId) || '';
    const startTimeMs = (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0;
    if (!docId || !callbackUrl || !embeddingSecret) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing required parameters: doc_id, callback_url, or embedding_secret.\n\n' +
            'To fix this, either:\n' +
            '1. Add a "Codika (Init Data Ingestion)" operation earlier in your workflow, OR\n' +
            '2. Manually configure doc_id, callback_url, and embedding_secret parameters.');
    }
    let extractedTags = [];
    if (Array.isArray(extractedTagsRaw)) {
        extractedTags = extractedTagsRaw;
    }
    else if (typeof extractedTagsRaw === 'string' && extractedTagsRaw.trim()) {
        if (extractedTagsRaw.trim().startsWith('[')) {
            try {
                extractedTags = JSON.parse(extractedTagsRaw);
            }
            catch {
                extractedTags = extractedTagsRaw.split(',').map((t) => t.trim());
            }
        }
        else {
            extractedTags = extractedTagsRaw.split(',').map((t) => t.trim());
        }
    }
    const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : 0;
    const callbackPayload = {
        doc_id: docId,
        process_id: processId,
        data_ingestion_id: dataIngestionId,
        embedding_secret: embeddingSecret,
        status,
        extracted_tags: extractedTags,
        executionTimeMs,
    };
    if (status === 'skipped') {
        const skipReason = this.getNodeParameter('skipReason', 0, '');
        if (skipReason) {
            callbackPayload.skip_reason = skipReason;
        }
    }
    else if (status === 'failed') {
        const errorMessage = this.getNodeParameter('errorMessage', 0, '');
        if (errorMessage) {
            callbackPayload.error_message = errorMessage;
        }
    }
    const options = {
        method: 'POST',
        url: callbackUrl,
        body: callbackPayload,
        json: true,
    };
    try {
        const response = await this.helpers.httpRequest(options);
        returnData.push({
            json: {
                success: true,
                docId,
                status,
                extractedTags,
                executionTimeMs,
                callbackResponse: response,
                _autoDetected: !!autoData && !manualDocId,
            },
        });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to call ingestion callback: ${error.message}`, { description: 'Check network connectivity and callback URL validity.' });
    }
    return [returnData];
}
//# sourceMappingURL=ingestionCallback.operation.js.map