import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
export const CODIKA_UPLOAD_URL = `${CODIKA_API_URL}/uploadWorkflowOutput`;

/**
 * Interface for execution data from the Init node
 */
export interface ExecutionData {
	executionId: string;
	executionSecret: string;
	startTimeMs: number;
}

/**
 * Tries to get execution data from the 'Codika Init' node.
 * Uses execution context (customData) set by the Init Workflow node.
 * Returns null if execution context is not available.
 */
export function tryGetInitNodeData(context: IExecuteFunctions, itemIndex = 0): ExecutionData | null {
	// Get execution data from customData (set by Init Workflow node)
	try {
		const proxy = context.getWorkflowDataProxy(itemIndex);
		const customData = proxy.$execution?.customData;

		if (customData) {
			const executionId = customData.get('codikaExecutionId');
			const executionSecret = customData.get('codikaExecutionSecret');
			const startTimeMs = customData.get('codikaStartTimeMs');

			if (executionId && executionSecret) {
				return {
					executionId,
					executionSecret,
					startTimeMs: startTimeMs ? parseInt(startTimeMs, 10) : 0,
				};
			}
		}
	} catch {
		// Execution context not available
	}

	return null;
}

/**
 * Validates that execution parameters are present and throws a helpful error if not.
 */
export function validateExecutionParams(
	executionId: string,
	executionSecret: string,
	context: IExecuteFunctions,
): void {
	if (!executionId || !executionSecret) {
		throw new NodeOperationError(
			context.getNode(),
			'Missing execution context: executionId or executionSecret not found.\n\n' +
				'This operation requires a "Codika > Init Workflow" node earlier in your workflow.\n' +
				'The Init Workflow node extracts these values from the webhook payload and stores them in the execution context.',
		);
	}
}

/**
 * Makes an HTTP request to the Codika API.
 */
export async function makeCodikaApiRequest(
	context: IExecuteFunctions,
	endpoint: string,
	body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${CODIKA_API_URL}/${endpoint}`,
		body,
		json: true,
	};

	const response = await context.helpers.httpRequest(options);

	if (response.success !== true) {
		const errorMessage = response.error || 'Unknown error';
		const errorCode = response.code || 'UNKNOWN';
		throw new NodeOperationError(
			context.getNode(),
			`Codika API error: ${errorMessage} (${errorCode})`,
		);
	}

	return response as Record<string, unknown>;
}
