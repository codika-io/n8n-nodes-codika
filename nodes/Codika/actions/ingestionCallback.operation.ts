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
	// Get ingestion data from customData (set by Init Data Ingestion node)
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
		displayName:
			'This operation requires a <strong>Codika node with "Init Data Ingestion" operation</strong> earlier in your workflow. ' +
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
];

export async function executeIngestionCallback(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	// Get ingestion data from Init Data Ingestion node (via execution context)
	const autoData = tryGetIngestionData(this);

	// Get user-configurable parameters
	const status = this.getNodeParameter('status', 0, 'success') as string;
	const extractedTagsRaw = this.getNodeParameter('extractedTags', 0, '') as string | string[];

	// Extract values from execution context
	const docId = autoData?.docId || '';
	const callbackUrl = autoData?.callbackUrl || '';
	const embeddingSecret = autoData?.embeddingSecret || '';
	const processId = autoData?.processId || '';
	const dataIngestionId = autoData?.dataIngestionId || '';
	const startTimeMs = autoData?.startTimeMs || 0;

	// Validate required parameters from execution context
	if (!docId || !callbackUrl || !embeddingSecret) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing ingestion context: doc_id, callback_url, or embedding_secret not found.\n\n' +
				'This operation requires a "Codika > Init Data Ingestion" node earlier in your workflow.\n' +
				'The Init Data Ingestion node extracts these values from the webhook payload and stores them in the execution context.',
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
