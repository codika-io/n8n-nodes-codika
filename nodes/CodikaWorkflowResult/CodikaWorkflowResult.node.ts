import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

/**
 * Interface for execution data from the Init node
 */
interface ExecutionData {
	executionId: string;
	executionSecret: string;
	startTimeMs: number;
}

/**
 * Tries to get execution data from the 'Codika Execution Init' node
 * Returns null if the node is not found or hasn't been executed
 */
function tryGetInitNodeData(context: IExecuteFunctions): ExecutionData | null {
	try {
		// Use n8n's expression evaluation to reference the Init node
		const expression = "$('Codika Execution Init').first().json";
		const result = context.evaluateExpression(expression, 0) as Record<string, unknown> | null;

		if (result?.executionId && result?.executionSecret) {
			return {
				executionId: result.executionId as string,
				executionSecret: result.executionSecret as string,
				startTimeMs: (result._startTimeMs as number) || 0,
			};
		}
	} catch {
		// Node not found, not executed, or expression failed
		// This is expected when Init node doesn't exist - fall back to manual params
	}
	return null;
}

export class CodikaWorkflowResult implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Workflow Result',
		name: 'codikaWorkflowResult',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Submit workflow result',
		description:
			'Submit the workflow result to Codika for execution tracking. Auto-detects execution parameters from Codika Execution Init node.',
		defaults: {
			name: 'Codika Workflow Result',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Auto-Detection',
				name: 'autoDetectNotice',
				type: 'notice',
				default: '',
				description:
					'Execution parameters (ID, secret, start time) are auto-populated from the "Codika Execution Init" node if present. You only need to configure resultData.',
			},
			{
				displayName: 'Execution ID',
				name: 'executionId',
				type: 'string',
				default: '',
				placeholder: 'Auto-detected from Codika Execution Init node',
				description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Execution Init").first().JSON.executionId }}.',
			},
			{
				displayName: 'Execution Secret',
				name: 'executionSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'Auto-detected from Codika Execution Init node',
				description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Execution Init").first().JSON.executionSecret }}.',
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
				displayName: 'Start Time (Ms)',
				name: 'startTimeMs',
				type: 'number',
				default: 0,
				placeholder: 'Auto-detected from Codika Execution Init node',
				description: 'Leave as 0 to auto-detect. Used for execution duration calculation. Manual override: ={{ $("Codika Execution Init").first().JSON._startTimeMs }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		// Try auto-detection from Init node first
		const autoData = tryGetInitNodeData(this);

		// Get manual parameter values (may be empty if relying on auto-detection)
		const manualExecutionId = this.getNodeParameter('executionId', 0, '') as string;
		const manualExecutionSecret = this.getNodeParameter('executionSecret', 0, '') as string;
		const resultDataRaw = this.getNodeParameter('resultData', 0) as string | object;
		const manualStartTimeMs = this.getNodeParameter('startTimeMs', 0, 0) as number;

		// Resolve final values: manual takes precedence if provided, otherwise use auto-detected
		const executionId = manualExecutionId || autoData?.executionId || '';
		const executionSecret = manualExecutionSecret || autoData?.executionSecret || '';
		const startTimeMs = manualStartTimeMs > 0 ? manualStartTimeMs : autoData?.startTimeMs || 0;

		// Validate required parameters
		if (!executionId || !executionSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing executionId or executionSecret.\n\n' +
					'To fix this, either:\n' +
					'1. Add a "Codika Execution Init" node earlier in your workflow (recommended), OR\n' +
					'2. Manually configure executionId and executionSecret parameters.\n\n' +
					'Note: The Init node must be named exactly "Codika Execution Init" for auto-detection to work.',
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
					_autoDetected: !!autoData && !manualExecutionId,
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
				`Failed to call Codika API: ${(error as Error).message}`,
				{ description: 'Check network connectivity and Codika service availability.' },
			);
		}

		return [returnData];
	}
}
