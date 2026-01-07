import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	tryGetInitNodeData,
	validateExecutionParams,
	makeCodikaApiRequest,
} from '../shared/executionUtils';

const displayOptions = {
	show: {
		resource: ['workflowOutputs'],
		operation: ['submitResult'],
	},
};

export const submitResultDescription: INodeProperties[] = [
	{
		displayName: 'Result Data',
		name: 'resultData',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions,
		placeholder: '{ "field1": "value1", "field2": "value2" }',
		description: 'The workflow result data as JSON object. Must match the workflow output schema.',
	},
];

export async function executeSubmitResult(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	// Get execution context from Init Workflow node
	const autoData = tryGetInitNodeData(this);

	// Get user-configurable parameters
	const resultDataRaw = this.getNodeParameter('resultData', 0) as string | object;

	// Extract values from execution context
	const executionId = autoData?.executionId || '';
	const executionSecret = autoData?.executionSecret || '';
	const startTimeMs = autoData?.startTimeMs || 0;

	// Validate required parameters from execution context
	validateExecutionParams(executionId, executionSecret, this);

	// Parse result data if it's a string
	let resultData: object;
	if (typeof resultDataRaw === 'string') {
		try {
			resultData = JSON.parse(resultDataRaw);
		} catch (e) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid JSON in resultData: ${(e as Error).message}`,
			);
		}
	} else {
		resultData = resultDataRaw;
	}

	// Calculate execution time if start time was provided
	const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;

	// Build request body
	const requestBody: Record<string, unknown> = {
		executionId,
		executionSecret,
		resultData,
	};

	if (executionTimeMs !== undefined) {
		requestBody.executionTimeMs = executionTimeMs;
	}

	try {
		// Make API request
		await makeCodikaApiRequest(this, 'submitWorkflowResult', requestBody);

		// Return success response
		returnData.push({
			json: {
				success: true,
				executionId,
				submittedAt: new Date().toISOString(),
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
