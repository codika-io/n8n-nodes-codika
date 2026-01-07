import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

export class CodikaWorkflowError implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Workflow Error',
		name: 'codikaWorkflowError',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Report workflow error',
		description: 'Report a workflow error to Codika for execution tracking',
		defaults: {
			name: 'Codika Workflow Error',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Execution ID',
				name: 'executionId',
				type: 'string',
				required: true,
				default: '',
				placeholder: "={{ $('Codika Execution Init').first().json.executionId }}",
				description: 'The execution ID from Codika Execution Init node',
			},
			{
				displayName: 'Execution Secret',
				name: 'executionSecret',
				type: 'string',
				required: true,
				typeOptions: { password: true },
				default: '',
				placeholder: "={{ $('Codika Execution Init').first().json.executionSecret }}",
				description: 'The execution secret from Codika Execution Init node',
			},
			{
				displayName: 'Error Message',
				name: 'errorMessage',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., Failed to process email: API timeout',
				description: 'A descriptive error message explaining what went wrong',
			},
			{
				displayName: 'Error Type',
				name: 'errorType',
				type: 'options',
				required: true,
				default: 'node_failure',
				options: [
					{
						name: 'Node Failure',
						value: 'node_failure',
						description: 'A workflow node failed to execute',
					},
					{
						name: 'Validation Error',
						value: 'validation_error',
						description: 'Input data failed validation',
					},
					{
						name: 'External API Error',
						value: 'external_api_error',
						description: 'An external service returned an error',
					},
					{
						name: 'Timeout',
						value: 'timeout',
						description: 'The operation timed out',
					},
				],
				description: 'The category of the error',
			},
			{
				displayName: 'Failed Node Name',
				name: 'failedNodeName',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'e.g., Gmail Trigger',
				description: 'Name of the node that caused the failure (optional)',
			},
			{
				displayName: 'Last Executed Node',
				name: 'lastExecutedNode',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'e.g., Process Data',
				description: 'Name of the last successfully executed node (optional)',
			},
			{
				displayName: 'Start Time (ms)',
				name: 'startTimeMs',
				type: 'number',
				required: false,
				default: 0,
				placeholder: "={{ $('Codika Execution Init').first().json._startTimeMs }}",
				description: 'Start time in milliseconds for execution duration calculation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		// Get parameters
		const executionId = this.getNodeParameter('executionId', 0) as string;
		const executionSecret = this.getNodeParameter('executionSecret', 0) as string;
		const errorMessage = this.getNodeParameter('errorMessage', 0) as string;
		const errorType = this.getNodeParameter('errorType', 0) as string;
		const failedNodeName = this.getNodeParameter('failedNodeName', 0) as string;
		const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0) as string;
		const startTimeMs = this.getNodeParameter('startTimeMs', 0) as number;

		// Validate required parameters
		if (!executionId || !executionSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing executionId or executionSecret. Ensure the Codika Execution Init node ran successfully.',
			);
		}

		if (!errorMessage) {
			throw new NodeOperationError(
				this.getNode(),
				'Error message is required.',
			);
		}

		// Calculate execution time if start time was provided
		const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;

		// Build request body
		const requestBody: Record<string, unknown> = {
			executionId,
			executionSecret,
			error: {
				message: errorMessage,
				type: errorType,
			},
		};

		if (failedNodeName) {
			(requestBody.error as Record<string, unknown>).failedNodeName = failedNodeName;
		}

		if (lastExecutedNode) {
			(requestBody.error as Record<string, unknown>).lastExecutedNode = lastExecutedNode;
		}

		if (executionTimeMs !== undefined) {
			requestBody.executionTimeMs = executionTimeMs;
		}

		// Make HTTP request to Codika API
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${CODIKA_API_URL}/submitWorkflowError`,
			body: requestBody,
			json: true,
		};

		try {
			const response = await this.helpers.httpRequest(options);

			// Check if submission was successful
			if (response.success !== true) {
				const apiErrorMessage = response.error || 'Unknown error';
				const errorCode = response.code || 'UNKNOWN';
				throw new NodeOperationError(
					this.getNode(),
					`Failed to submit workflow error: ${apiErrorMessage} (${errorCode})`,
				);
			}

			// Return success response (don't throw - this node IS the error handler)
			returnData.push({
				json: {
					success: true,
					executionId,
					reportedAt: new Date().toISOString(),
					errorType,
					executionTimeMs,
				},
			});
		} catch (error) {
			// If it's already a NodeOperationError, re-throw it
			if (error instanceof NodeOperationError) {
				throw error;
			}

			// Otherwise, wrap it in a NodeOperationError
			throw new NodeOperationError(
				this.getNode(),
				`Failed to call Codika API: ${error.message}`,
				{ description: 'Check network connectivity and Codika service availability.' },
			);
		}

		return [returnData];
	}
}
