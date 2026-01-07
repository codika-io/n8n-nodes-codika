import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Interface for ingestion data from context or Init node
 */
interface IngestionData {
	docId: string;
	callbackUrl: string;
	embeddingSecret: string;
	processId: string;
	dataIngestionId: string;
	startTimeMs: number;
}

/**
 * Tries to get ingestion data from execution context (set by initDataIngestion)
 */
function tryGetIngestionData(context: IExecuteFunctions, itemIndex = 0): IngestionData | null {
	// Method 1: Try execution context (most reliable)
	try {
		const proxy = context.getWorkflowDataProxy(itemIndex);
		const customData = proxy.$execution?.customData;

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
	} catch {
		// Execution context not available
	}

	// Method 2: Fallback - try direct node reference
	try {
		const expression = "$('Codika').first().json";
		const result = context.evaluateExpression(expression, itemIndex) as Record<
			string,
			unknown
		> | null;

		if (result?.docId && result?.callbackUrl && result?.embeddingSecret) {
			return {
				docId: result.docId as string,
				callbackUrl: result.callbackUrl as string,
				embeddingSecret: result.embeddingSecret as string,
				processId: (result.processId as string) || '',
				dataIngestionId: (result.dataIngestionId as string) || '',
				startTimeMs: (result._startTimeMs as number) || 0,
			};
		}
	} catch {
		// Direct reference failed
	}

	return null;
}

const displayOptions = {
	show: {
		resource: ['dataIngestion'],
		operation: ['ingestionCallback'],
	},
};

export const ingestionCallbackDescription: INodeProperties[] = [
	{
		displayName: 'Auto-Detection',
		name: 'autoDetectNotice',
		type: 'notice',
		default: '',
		displayOptions,
		description:
			'Callback parameters (doc_id, callback_url, embedding_secret) are auto-detected from the "Codika (Init Data Ingestion)" operation. Only configure status and extracted_tags.',
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
		description:
			'Comma-separated list of tags extracted from the document, or use expression to pass array',
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
	// Manual override fields
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

export async function executeIngestionCallback(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	// Try auto-detection from Init node first
	const autoData = tryGetIngestionData(this);

	// Get manual parameter values
	const manualDocId = this.getNodeParameter('docId', 0, '') as string;
	const manualCallbackUrl = this.getNodeParameter('callbackUrl', 0, '') as string;
	const manualEmbeddingSecret = this.getNodeParameter('embeddingSecret', 0, '') as string;
	const status = this.getNodeParameter('status', 0, 'success') as string;
	const extractedTagsRaw = this.getNodeParameter('extractedTags', 0, '') as string | string[];

	// Resolve final values (manual takes precedence)
	const docId = manualDocId || autoData?.docId || '';
	const callbackUrl = manualCallbackUrl || autoData?.callbackUrl || '';
	const embeddingSecret = manualEmbeddingSecret || autoData?.embeddingSecret || '';
	const processId = autoData?.processId || '';
	const dataIngestionId = autoData?.dataIngestionId || '';
	const startTimeMs = autoData?.startTimeMs || 0;

	// Validate required parameters
	if (!docId || !callbackUrl || !embeddingSecret) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing required parameters: doc_id, callback_url, or embedding_secret.\n\n' +
				'To fix this, either:\n' +
				'1. Add a "Codika (Init Data Ingestion)" operation earlier in your workflow, OR\n' +
				'2. Manually configure doc_id, callback_url, and embedding_secret parameters.',
		);
	}

	// Parse extracted tags
	let extractedTags: string[] = [];
	if (Array.isArray(extractedTagsRaw)) {
		extractedTags = extractedTagsRaw;
	} else if (typeof extractedTagsRaw === 'string' && extractedTagsRaw.trim()) {
		// Check if it's a JSON array string
		if (extractedTagsRaw.trim().startsWith('[')) {
			try {
				extractedTags = JSON.parse(extractedTagsRaw);
			} catch {
				// Fallback to comma-separated
				extractedTags = extractedTagsRaw.split(',').map((t) => t.trim());
			}
		} else {
			extractedTags = extractedTagsRaw.split(',').map((t) => t.trim());
		}
	}

	// Calculate execution time
	const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : 0;

	// Build callback payload
	const callbackPayload: Record<string, unknown> = {
		doc_id: docId,
		process_id: processId,
		data_ingestion_id: dataIngestionId,
		embedding_secret: embeddingSecret,
		status,
		extracted_tags: extractedTags,
		executionTimeMs,
	};

	// Add status-specific fields
	if (status === 'skipped') {
		const skipReason = this.getNodeParameter('skipReason', 0, '') as string;
		if (skipReason) {
			callbackPayload.skip_reason = skipReason;
		}
	} else if (status === 'failed') {
		const errorMessage = this.getNodeParameter('errorMessage', 0, '') as string;
		if (errorMessage) {
			callbackPayload.error_message = errorMessage;
		}
	}

	// Make HTTP request to callback URL
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: callbackUrl,
		body: callbackPayload,
		json: true,
	};

	try {
		const response = await this.helpers.httpRequest(options);

		// Return success response
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
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to call ingestion callback: ${(error as Error).message}`,
			{ description: 'Check network connectivity and callback URL validity.' },
		);
	}

	return [returnData];
}
