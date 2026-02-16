import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Interface for data ingestion metadata from webhook payload
 */
interface DataIngestionMetadata {
	docId: string;
	markdownContent: string;
	processId?: string;
	namespace?: string;
	callbackUrl?: string;
	embeddingSecret?: string;
	dataIngestionId?: string;
	contextType?: string;
	contextId?: string;
	processInstanceId?: string;
	cost?: number;
	existingTags?: string[];
	availableTags?: string[];
}

/**
 * Tries to extract data ingestion metadata from webhook payload
 */
function tryExtractIngestionMetadata(inputData: INodeExecutionData[]): DataIngestionMetadata | null {
	if (!inputData || inputData.length === 0) {
		return null;
	}

	const firstItem = inputData[0]?.json;
	if (!firstItem) {
		return null;
	}

	// Check for data at body level (n8n webhook) or at root level
	const bodyData = (firstItem as Record<string, unknown>).body || firstItem;
	const data = bodyData as Record<string, unknown>;

	// Get doc_id (required)
	const docId = (data.doc_id as string) || (data.docId as string);
	if (!docId) {
		return null;
	}

	// Get markdown content (required)
	const markdownContent = (data.markdown_content as string) || (data.markdownContent as string);
	if (!markdownContent) {
		return null;
	}

	return {
		docId,
		markdownContent,
		processId: (data.process_id as string) || (data.processId as string),
		namespace: data.namespace as string,
		callbackUrl: (data.callback_url as string) || (data.callbackUrl as string),
		embeddingSecret: (data.embedding_secret as string) || (data.embeddingSecret as string),
		dataIngestionId: (data.data_ingestion_id as string) || (data.dataIngestionId as string),
		contextType: (data.context_type as string) || (data.contextType as string),
		contextId: (data.context_id as string) || (data.contextId as string),
		processInstanceId: (data.process_instance_id as string) || (data.processInstanceId as string),
		cost: typeof data.cost === 'number' ? data.cost : undefined,
		existingTags: (data.existing_tags as string[]) || (data.existingTags as string[]),
		availableTags: (data.available_tags as string[]) || (data.availableTags as string[]),
	};
}

/**
 * Pure JS hash function (cyrb53) for content deduplication
 * Used to check if document content has changed
 */
function cyrb53(str: string, seed = 0): string {
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

export const initDataIngestionDescription: INodeProperties[] = [
	{
		displayName: 'Data Ingestion Info',
		name: 'ingestionNotice',
		type: 'notice',
		default: '',
		displayOptions,
		description:
			'Initialize a data ingestion workflow (RAG embedding). Auto-extracts doc_id, markdown_content, callback_url from webhook payload. Generates content hash for deduplication.',
	},
	{
		displayName: 'Namespace',
		name: 'namespace',
		type: 'string',
		default: '',
		displayOptions,
		placeholder: '{{PROCDATA_NAMESPACE_ATADCORP}}',
		description:
			'Pinecone namespace for vector storage. Use placeholder for deployment-time injection.',
	},
];

export async function executeInitDataIngestion(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const startTimeMs = Date.now();

	// Get namespace parameter
	const namespaceParam = this.getNodeParameter('namespace', 0, '') as string;

	// Try to extract data ingestion metadata from webhook payload
	const ingestionMetadata = tryExtractIngestionMetadata(items);

	if (!ingestionMetadata) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing required data ingestion fields in webhook payload.\n\n' +
				'Required fields:\n' +
				'- doc_id: Unique identifier for the document\n' +
				'- markdown_content: The document content to embed\n\n' +
				'Optional fields:\n' +
				'- callback_url: URL to report ingestion status\n' +
				'- embedding_secret: Secret for callback authentication\n' +
				'- existing_tags: Array of existing tags\n' +
				'- available_tags: Array of available tag options',
		);
	}

	// Generate content hash for deduplication
	const contentHash = cyrb53(ingestionMetadata.markdownContent.trim());

	// Generate document_id from doc_id (sanitize for use in vector IDs)
	const documentId = `doc_${ingestionMetadata.docId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

	// Determine namespace (parameter takes precedence, then payload, then empty)
	const namespace = namespaceParam || ingestionMetadata.namespace || '';

	// Determine if callback is available
	const hasCallback = !!(ingestionMetadata.callbackUrl && ingestionMetadata.embeddingSecret);

	// Build output
	returnData.push({
		json: {
			// Document identifiers
			docId: ingestionMetadata.docId,
			documentId,
			contentHash,

			// Content
			markdownContent: ingestionMetadata.markdownContent,

			// Namespace and process info
			namespace,
			processId: ingestionMetadata.processId || '',

			// Callback info
			callbackUrl: ingestionMetadata.callbackUrl || '',
			embeddingSecret: ingestionMetadata.embeddingSecret || '',
			hasCallback,

			// Tracking
			dataIngestionId: ingestionMetadata.dataIngestionId || '',
			contextType: ingestionMetadata.contextType || '',
			contextId: ingestionMetadata.contextId || '',
			processInstanceId: ingestionMetadata.processInstanceId || '',
			cost: ingestionMetadata.cost,

			// Tags
			existingTags: ingestionMetadata.existingTags || [],
			availableTags: ingestionMetadata.availableTags || ['proposal', 'rfp'],

			// Timing
			_startTimeMs: startTimeMs,
			timestamp: new Date().toISOString(),
		},
	});

	// Store in execution context for downstream nodes
	try {
		const executionContext = this.getWorkflowDataProxy(0).$execution;
		if (executionContext?.customData) {
			// Store ingestion-specific context
			executionContext.customData.set('codikaDocId', ingestionMetadata.docId);
			executionContext.customData.set('codikaDocumentId', documentId);
			executionContext.customData.set('codikaContentHash', contentHash);
			executionContext.customData.set('codikaNamespace', namespace);
			executionContext.customData.set('codikaProcessId', ingestionMetadata.processId || '');
			executionContext.customData.set('codikaCallbackUrl', ingestionMetadata.callbackUrl || '');
			executionContext.customData.set(
				'codikaEmbeddingSecret',
				ingestionMetadata.embeddingSecret || '',
			);
			executionContext.customData.set(
				'codikaDataIngestionId',
				ingestionMetadata.dataIngestionId || '',
			);
			executionContext.customData.set(
				'codikaProcessInstanceId',
				ingestionMetadata.processInstanceId || '',
			);
			executionContext.customData.set(
				'codikaContextType',
				ingestionMetadata.contextType || '',
			);
			executionContext.customData.set(
				'codikaCost',
				String(ingestionMetadata.cost ?? ''),
			);
			executionContext.customData.set('codikaStartTimeMs', String(startTimeMs));
			executionContext.customData.set('codikaHasCallback', hasCallback ? 'true' : 'false');
		}
	} catch {
		// Execution context not available
	}

	return [returnData];
}
