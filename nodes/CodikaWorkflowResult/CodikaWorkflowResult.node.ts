import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

export class CodikaWorkflowResult implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Workflow Result',
		name: 'codikaWorkflowResult',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Submit workflow result',
		description: 'Submit the workflow result to Codika for execution tracking',
		defaults: {
			name: 'Codika Workflow Result',
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
				displayName: 'Result Data',
				name: 'resultData',
				type: 'json',
				required: true,
				default: '{}',
				placeholder: '{ "field1": "value1", "field2": "value2" }',
				description: 'The workflow result data as JSON object. Must match the workflow output schema.',
			},
			{
				displayName: 'Start Time (ms)',
				name: 'startTimeMs',
				type: 'number',
				required: false,
				default: 0,
				placeholder: "={{ $('Codika Execution Init').first().json._startTimeMs }}",
				description: 'Start time in milliseconds for execution duration calculation. If provided, executionTimeMs will be calculated automatically.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		// Get parameters
		const executionId = this.getNodeParameter('executionId', 0) as string;
		const executionSecret = this.getNodeParameter('executionSecret', 0) as string;
		const resultDataRaw = this.getNodeParameter('resultData', 0) as string | object;
		const startTimeMs = this.getNodeParameter('startTimeMs', 0) as number;

		// Validate required parameters
		if (!executionId || !executionSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing executionId or executionSecret. Ensure the Codika Execution Init node ran successfully.',
			);
		}

		// Parse result data if it's a string
		let resultData: object;
		if (typeof resultDataRaw === 'string') {
			try {
				resultData = JSON.parse(resultDataRaw);
			} catch (e) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid JSON in resultData: ${e.message}`,
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
			result: resultData,
		};

		if (executionTimeMs !== undefined) {
			requestBody.executionTimeMs = executionTimeMs;
		}

		// Make HTTP request to Codika API
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${CODIKA_API_URL}/submitWorkflowResult`,
			body: requestBody,
			json: true,
		};

		try {
			const response = await this.helpers.httpRequest(options);

			// Check if submission was successful
			if (response.success !== true) {
				const errorMessage = response.error || 'Unknown error';
				const errorCode = response.code || 'UNKNOWN';
				throw new NodeOperationError(
					this.getNode(),
					`Failed to submit workflow result: ${errorMessage} (${errorCode})`,
				);
			}

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
