"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDataIngestionDescription = void 0;
exports.executeInitDataIngestion = executeInitDataIngestion;
const n8n_workflow_1 = require("n8n-workflow");
function tryExtractIngestionMetadata(inputData) {
    var _a;
    if (!inputData || inputData.length === 0) {
        return null;
    }
    const firstItem = (_a = inputData[0]) === null || _a === void 0 ? void 0 : _a.json;
    if (!firstItem) {
        return null;
    }
    const bodyData = firstItem.body || firstItem;
    const data = bodyData;
    const docId = data.doc_id || data.docId;
    if (!docId) {
        return null;
    }
    const markdownContent = data.markdown_content || data.markdownContent;
    if (!markdownContent) {
        return null;
    }
    return {
        docId,
        markdownContent,
        processId: data.process_id || data.processId,
        namespace: data.namespace,
        callbackUrl: data.callback_url || data.callbackUrl,
        embeddingSecret: data.embedding_secret || data.embeddingSecret,
        dataIngestionId: data.data_ingestion_id || data.dataIngestionId,
        contextType: data.context_type || data.contextType,
        contextId: data.context_id || data.contextId,
        processInstanceId: data.process_instance_id || data.processInstanceId,
        cost: typeof data.cost === 'number' ? data.cost : undefined,
        existingTags: data.existing_tags || data.existingTags,
        availableTags: data.available_tags || data.availableTags,
    };
}
function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
const displayOptions = {
    show: {
        resource: ['initializeExecution'],
        operation: ['initDataIngestion'],
    },
};
exports.initDataIngestionDescription = [
    {
        displayName: 'Data Ingestion Info',
        name: 'ingestionNotice',
        type: 'notice',
        default: '',
        displayOptions,
        description: 'Initialize a data ingestion workflow (RAG embedding). Auto-extracts doc_id, markdown_content, callback_url from webhook payload. Generates content hash for deduplication.',
    },
    {
        displayName: 'Namespace',
        name: 'namespace',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: '{{PROCDATA_NAMESPACE_ATADCORP}}',
        description: 'Pinecone namespace for vector storage. Use placeholder for deployment-time injection.',
    },
];
async function executeInitDataIngestion() {
    var _a;
    const items = this.getInputData();
    const returnData = [];
    const startTimeMs = Date.now();
    const namespaceParam = this.getNodeParameter('namespace', 0, '');
    const ingestionMetadata = tryExtractIngestionMetadata(items);
    if (!ingestionMetadata) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing required data ingestion fields in webhook payload.\n\n' +
            'Required fields:\n' +
            '- doc_id: Unique identifier for the document\n' +
            '- markdown_content: The document content to embed\n\n' +
            'Optional fields:\n' +
            '- callback_url: URL to report ingestion status\n' +
            '- embedding_secret: Secret for callback authentication\n' +
            '- existing_tags: Array of existing tags\n' +
            '- available_tags: Array of available tag options');
    }
    const contentHash = cyrb53(ingestionMetadata.markdownContent.trim());
    const documentId = `doc_${ingestionMetadata.docId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const namespace = namespaceParam || ingestionMetadata.namespace || '';
    const hasCallback = !!(ingestionMetadata.callbackUrl && ingestionMetadata.embeddingSecret);
    returnData.push({
        json: {
            docId: ingestionMetadata.docId,
            documentId,
            contentHash,
            markdownContent: ingestionMetadata.markdownContent,
            namespace,
            processId: ingestionMetadata.processId || '',
            callbackUrl: ingestionMetadata.callbackUrl || '',
            embeddingSecret: ingestionMetadata.embeddingSecret || '',
            hasCallback,
            dataIngestionId: ingestionMetadata.dataIngestionId || '',
            contextType: ingestionMetadata.contextType || '',
            contextId: ingestionMetadata.contextId || '',
            processInstanceId: ingestionMetadata.processInstanceId || '',
            cost: ingestionMetadata.cost,
            existingTags: ingestionMetadata.existingTags || [],
            availableTags: ingestionMetadata.availableTags || ['proposal', 'rfp'],
            _startTimeMs: startTimeMs,
            timestamp: new Date().toISOString(),
        },
    });
    try {
        const executionContext = this.getWorkflowDataProxy(0).$execution;
        if (executionContext === null || executionContext === void 0 ? void 0 : executionContext.customData) {
            executionContext.customData.set('codikaDocId', ingestionMetadata.docId);
            executionContext.customData.set('codikaDocumentId', documentId);
            executionContext.customData.set('codikaContentHash', contentHash);
            executionContext.customData.set('codikaNamespace', namespace);
            executionContext.customData.set('codikaProcessId', ingestionMetadata.processId || '');
            executionContext.customData.set('codikaCallbackUrl', ingestionMetadata.callbackUrl || '');
            executionContext.customData.set('codikaEmbeddingSecret', ingestionMetadata.embeddingSecret || '');
            executionContext.customData.set('codikaDataIngestionId', ingestionMetadata.dataIngestionId || '');
            executionContext.customData.set('codikaProcessInstanceId', ingestionMetadata.processInstanceId || '');
            executionContext.customData.set('codikaContextType', ingestionMetadata.contextType || '');
            executionContext.customData.set('codikaCost', String((_a = ingestionMetadata.cost) !== null && _a !== void 0 ? _a : ''));
            executionContext.customData.set('codikaStartTimeMs', String(startTimeMs));
            executionContext.customData.set('codikaHasCallback', hasCallback ? 'true' : 'false');
        }
    }
    catch {
    }
    return [returnData];
}
//# sourceMappingURL=initDataIngestion.operation.js.map