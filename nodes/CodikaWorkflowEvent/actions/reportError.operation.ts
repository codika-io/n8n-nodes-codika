import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	tryGetInitNodeData,
	validateExecutionParams,
	resolveExecutionParams,
	makeCodikaApiRequest,
} from '../shared/executionUtils';

const displayOptions = {
	show: {
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

	// Try auto-detection from Init node first
	const autoData = tryGetInitNodeData(this);

	// Get manual parameter values (may be empty if relying on auto-detection)
	const manualExecutionId = this.getNodeParameter('executionId', 0, '') as string;
	const manualExecutionSecret = this.getNodeParameter('executionSecret', 0, '') as string;
	const errorMessage = this.getNodeParameter('errorMessage', 0) as string;
	const errorType = this.getNodeParameter('errorType', 0) as string;
	const failedNodeName = this.getNodeParameter('failedNodeName', 0, '') as string;
	const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0, '') as string;
	const manualStartTimeMs = this.getNodeParameter('startTimeMs', 0, 0) as number;

	// Resolve final values
	const { executionId, executionSecret, startTimeMs } = resolveExecutionParams(
		autoData,
		manualExecutionId,
		manualExecutionSecret,
		manualStartTimeMs,
	);

	// Validate required parameters
	validateExecutionParams(executionId, executionSecret, this);

	if (!errorMessage) {
		throw new NodeOperationError(this.getNode(), 'Error message is required.');
	}

	// Calculate execution time if start time was provided
	const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;

	// Build request body
	const errorObject: Record<string, unknown> = {
		message: errorMessage,
		type: errorType,
	};

	if (failedNodeName) {
		errorObject.failedNodeName = failedNodeName;
	}

	if (lastExecutedNode) {
		errorObject.lastExecutedNode = lastExecutedNode;
	}

	const requestBody: Record<string, unknown> = {
		executionId,
		executionSecret,
		error: errorObject,
	};

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
				_autoDetected: !!autoData && !manualExecutionId,
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
