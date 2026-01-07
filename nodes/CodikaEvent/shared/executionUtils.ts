import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

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
 * Returns null if the node is not found or hasn't been executed.
 */
export function tryGetInitNodeData(context: IExecuteFunctions): ExecutionData | null {
	try {
		// Use n8n's expression evaluation to reference the Init node
		const expression = "$('Codika Init').first().json";
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
			'Missing executionId or executionSecret.\n\n' +
				'To fix this, either:\n' +
				'1. Add a "Codika Init" node earlier in your workflow (recommended), OR\n' +
				'2. Manually configure executionId and executionSecret parameters.\n\n' +
				'Note: The Init node must be named exactly "Codika Init" for auto-detection to work.',
		);
	}
}

/**
 * Resolves execution parameters from auto-detection and manual inputs.
 * Manual values take precedence if provided.
 */
export function resolveExecutionParams(
	autoData: ExecutionData | null,
	manualExecutionId: string,
	manualExecutionSecret: string,
	manualStartTimeMs: number,
): { executionId: string; executionSecret: string; startTimeMs: number } {
	return {
		executionId: manualExecutionId || autoData?.executionId || '',
		executionSecret: manualExecutionSecret || autoData?.executionSecret || '',
		startTimeMs: manualStartTimeMs > 0 ? manualStartTimeMs : autoData?.startTimeMs || 0,
	};
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
