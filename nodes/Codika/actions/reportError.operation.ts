import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	tryGetInitNodeData,
	validateExecutionParams,
	makeCodikaApiRequest,
} from '../shared/executionUtils';

const displayOptions = {
	show: {
		resource: ['errorHandling'],
		operation: ['reportError'],
	},
};

export const reportErrorDescription: INodeProperties[] = [
	{
		displayName: 'Error Message',
		name: 'errorMessage',
		type: 'string',
		required: true,
		default: '',
		displayOptions,
		placeholder: 'e.g., Failed to process email: API timeout',
		description: 'A descriptive error message explaining what went wrong',
	},
	{
		displayName: 'Error Type',
		name: 'errorType',
		type: 'options',
		required: true,
		default: 'node_failure',
		displayOptions,
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
		default: '',
		displayOptions,
		placeholder: 'e.g., Gmail Trigger',
		description: 'Name of the node that caused the failure (optional)',
	},
	{
		displayName: 'Last Executed Node',
		name: 'lastExecutedNode',
		type: 'string',
		default: '',
		displayOptions,
		placeholder: 'e.g., Process Data',
		description: 'Name of the last successfully executed node (optional)',
	},
];

export async function executeReportError(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	// Get execution context from Init Workflow node
	const autoData = tryGetInitNodeData(this);

	// Get user-configurable parameters
	const errorMessage = this.getNodeParameter('errorMessage', 0) as string;
	const errorType = this.getNodeParameter('errorType', 0) as string;
	const failedNodeName = this.getNodeParameter('failedNodeName', 0, '') as string;
	const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0, '') as string;

	// Extract values from execution context
	const executionId = autoData?.executionId || '';
	const executionSecret = autoData?.executionSecret || '';
	const startTimeMs = autoData?.startTimeMs || 0;

	// Validate required parameters from execution context
	validateExecutionParams(executionId, executionSecret, this);

	if (!errorMessage) {
		throw new NodeOperationError(this.getNode(), 'Error message is required.');
	}

	// Calculate execution time if start time was provided
	const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;

	// Build request body - API expects flat structure, not nested error object
	const requestBody: Record<string, unknown> = {
		executionId,
		executionSecret,
		errorType,
		errorMessage,
	};

	if (failedNodeName) {
		requestBody.failedNodeName = failedNodeName;
	}

	if (lastExecutedNode) {
		requestBody.lastExecutedNode = lastExecutedNode;
	}

	if (executionTimeMs !== undefined) {
		requestBody.executionTimeMs = executionTimeMs;
	}

	try {
		// Make API request
		await makeCodikaApiRequest(this, 'submitWorkflowError', requestBody);

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
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw new NodeOperationError(
			this.getNode(),
			`Failed to call Codika API: ${(error as Error).message}`,
			{ description: 'Check network connectivity and Codika service availability.' },
		);
	}

	return [returnData];
}
