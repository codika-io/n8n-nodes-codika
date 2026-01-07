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
        displayName: 'This operation requires a <strong>Codika node with "Init Data Ingestion" operation</strong> earlier in your workflow. ' +
            'That operation captures the document ID, callback URL, and embedding secret from the webhook payload, which are needed here to report the ingestion status back to Codika.',
        name: 'requiresInitNotice',
        type: 'notice',
        default: '',
        displayOptions,
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
                name: 'Failed',
                value: 'failed',
                description: 'Document embedding failed',
            },
            {
                name: 'Skipped',
                value: 'skipped',
                description: 'Document was skipped (duplicate/unchanged)',
            },
            {
                name: 'Success',
                value: 'success',
                description: 'Document was successfully embedded',
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
];
async function executeIngestionCallback() {
    const returnData = [];
    const autoData = tryGetIngestionData(this);
    const status = this.getNodeParameter('status', 0, 'success');
    const extractedTagsRaw = this.getNodeParameter('extractedTags', 0, '');
    const docId = (autoData === null || autoData === void 0 ? void 0 : autoData.docId) || '';
    const callbackUrl = (autoData === null || autoData === void 0 ? void 0 : autoData.callbackUrl) || '';
    const embeddingSecret = (autoData === null || autoData === void 0 ? void 0 : autoData.embeddingSecret) || '';
    const processId = (autoData === null || autoData === void 0 ? void 0 : autoData.processId) || '';
    const dataIngestionId = (autoData === null || autoData === void 0 ? void 0 : autoData.dataIngestionId) || '';
    const startTimeMs = (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0;
    if (!docId || !callbackUrl || !embeddingSecret) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing ingestion context: doc_id, callback_url, or embedding_secret not found.\n\n' +
            'This operation requires a "Codika > Init Data Ingestion" node earlier in your workflow.\n' +
            'The Init Data Ingestion node extracts these values from the webhook payload and stores them in the execution context.');
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
            },
        });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to call ingestion callback: ${error.message}`, { description: 'Check network connectivity and callback URL validity.' });
    }
    return [returnData];
}
//# sourceMappingURL=ingestionCallback.operation.js.map