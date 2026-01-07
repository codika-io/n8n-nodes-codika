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
 * Interface for execution metadata from HTTP triggers
 */
interface ExecutionMetadata {
	executionId: string;
	executionSecret: string;
	callbackUrl: string;
	errorCallbackUrl?: string;
	workflowId?: string;
	processId?: string;
	processInstanceId?: string;
	userId?: string;
}

/**
 * Tries to extract execution metadata from HTTP trigger payload
 * Returns null if not found or incomplete
 */
function tryExtractHttpTriggerMetadata(inputData: INodeExecutionData[]): ExecutionMetadata | null {
	if (!inputData || inputData.length === 0) {
		return null;
	}

	const firstItem = inputData[0]?.json;
	if (!firstItem) {
		return null;
	}

	// Check for executionMetadata at body level (n8n webhook) or at root level
	const bodyData = (firstItem as Record<string, unknown>).body || firstItem;
	const metadata = (bodyData as Record<string, unknown>).executionMetadata as
		| ExecutionMetadata
		| undefined;

	// Validate required fields for HTTP trigger mode
	if (metadata?.executionId && metadata?.executionSecret && metadata?.callbackUrl) {
		return {
			executionId: metadata.executionId,
			executionSecret: metadata.executionSecret,
			callbackUrl: metadata.callbackUrl,
			errorCallbackUrl: metadata.errorCallbackUrl,
			workflowId: metadata.workflowId,
			processId: metadata.processId,
			processInstanceId: metadata.processInstanceId,
			userId: metadata.userId,
		};
	}

	return null;
}

export class CodikaInit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Init',
		name: 'codikaInit',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Initialize workflow execution',
		description:
			'Initialize a Codika workflow execution. Auto-detects HTTP triggers (passthrough) vs Schedule/Service triggers (creates execution via API).',
		defaults: {
			name: 'Codika Init',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Mode Detection',
				name: 'modeNotice',
				type: 'notice',
				default: '',
				description:
					'This node auto-detects the trigger type. For HTTP triggers (from Codika UI), it extracts execution metadata from the payload (passthrough mode). For other triggers (schedule, Gmail, etc.), it creates a new execution via API using the parameters below.',
			},
			{
				displayName: 'Member Secret',
				name: 'memberSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Required for non-HTTP triggers. Codika member execution auth secret (use placeholder: {{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}).',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				description: 'Required for non-HTTP triggers. Codika organization ID (use placeholder: {{USERDATA_ORGANIZATION_ID_ATADRESU}}).',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Required for non-HTTP triggers. Codika user ID (use placeholder: {{USERDATA_USER_ID_ATADRESU}}).',
			},
			{
				displayName: 'Process Instance ID',
				name: 'processInstanceId',
				type: 'string',
				default: '',
				description: 'Required for non-HTTP triggers. Codika process instance ID (use placeholder: {{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}).',
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				default: '',
				placeholder: 'e.g., gmail-draft-assistant',
				description: 'Required for non-HTTP triggers. The workflow template ID.',
			},
			{
				displayName: 'Trigger Type',
				name: 'triggerType',
				type: 'string',
				default: '',
				placeholder: 'e.g., gmail, calendly, schedule',
				description: 'Required for non-HTTP triggers. The type of trigger that initiated this workflow.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const startTimeMs = Date.now();

		// Try to detect HTTP trigger mode by looking for executionMetadata in payload
		const httpTriggerMetadata = tryExtractHttpTriggerMetadata(items);

		if (httpTriggerMetadata) {
			// ============ PASSTHROUGH MODE ============
			// HTTP trigger: execution metadata already exists in payload
			// Just extract and normalize it for downstream nodes

			returnData.push({
				json: {
					executionId: httpTriggerMetadata.executionId,
					executionSecret: httpTriggerMetadata.executionSecret,
					callbackUrl: httpTriggerMetadata.callbackUrl,
					errorCallbackUrl: httpTriggerMetadata.errorCallbackUrl || '',
					processId: httpTriggerMetadata.processId || '',
					processInstanceId: httpTriggerMetadata.processInstanceId || '',
					userId: httpTriggerMetadata.userId || '',
					workflowId: httpTriggerMetadata.workflowId || '',
					_startTimeMs: startTimeMs,
					_mode: 'passthrough',
				},
			});

			// Store in execution context for downstream nodes (works across all node types)
			try {
				const executionContext = this.getWorkflowDataProxy(0).$execution;
				if (executionContext?.customData) {
					executionContext.customData.set('codikaExecutionId', httpTriggerMetadata.executionId);
					executionContext.customData.set('codikaExecutionSecret', httpTriggerMetadata.executionSecret);
					executionContext.customData.set('codikaStartTimeMs', String(startTimeMs));
				}
			} catch {
				// Execution context not available - will fall back to expression evaluation
			}

			return [returnData];
		}

		// ============ CREATE MODE ============
		// Non-HTTP trigger: must create execution via API

		// Get parameters (same for all items, placeholders replaced at deployment)
		const memberSecret = this.getNodeParameter('memberSecret', 0, '') as string;
		const organizationId = this.getNodeParameter('organizationId', 0, '') as string;
		const userId = this.getNodeParameter('userId', 0, '') as string;
		const processInstanceId = this.getNodeParameter('processInstanceId', 0, '') as string;
		const workflowId = this.getNodeParameter('workflowId', 0, '') as string;
		const triggerType = this.getNodeParameter('triggerType', 0, '') as string;

		// Validate required parameters for create mode
		if (
			!memberSecret ||
			!organizationId ||
			!userId ||
			!processInstanceId ||
			!workflowId ||
			!triggerType
		) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing required parameters for non-HTTP trigger mode.\n\n' +
					'If this is an HTTP trigger workflow, ensure the webhook payload contains executionMetadata.\n\n' +
					'If this is a schedule/service trigger workflow, configure all parameters:\n' +
					'- Member Secret ({{MEMSECRT_EXECUTION_AUTH_TRCESMEM}})\n' +
					'- Organization ID ({{USERDATA_ORGANIZATION_ID_ATADRESU}})\n' +
					'- User ID ({{USERDATA_USER_ID_ATADRESU}})\n' +
					'- Process Instance ID ({{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}})\n' +
					'- Workflow ID\n' +
					'- Trigger Type',
			);
		}

		// Combine all input items as trigger data
		const triggerData = items.map((item) => item.json);

		// Build request body
		const requestBody = {
			memberSecret,
			organizationId,
			userId,
			processInstanceId,
			workflowId,
			triggerType,
			triggerData: triggerData.length === 1 ? triggerData[0] : triggerData,
		};

		// Make HTTP request to Codika API
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${CODIKA_API_URL}/createWorkflowExecution`,
			body: requestBody,
			json: true,
		};

		try {
			const response = await this.helpers.httpRequest(options);

			// Check if initialization was successful
			if (response.success !== true) {
				const errorMessage = response.error || 'Unknown error';
				const errorCode = response.code || 'UNKNOWN';
				throw new NodeOperationError(
					this.getNode(),
					`Codika execution initialization failed: ${errorMessage} (${errorCode})`,
					{ description: 'The workflow will be aborted.' },
				);
			}

			// Return the execution metadata
			returnData.push({
				json: {
					executionId: response.executionId,
					executionSecret: response.executionSecret,
					callbackUrl: response.callbackUrl,
					errorCallbackUrl: response.errorCallbackUrl,
					processId: response.processId,
					processInstanceId: processInstanceId,
					userId: response.userId,
					workflowId: workflowId,
					_startTimeMs: startTimeMs,
					_mode: 'create',
				},
			});

			// Store in execution context for downstream nodes (works across all node types)
			try {
				const executionContext = this.getWorkflowDataProxy(0).$execution;
				if (executionContext?.customData) {
					executionContext.customData.set('codikaExecutionId', response.executionId as string);
					executionContext.customData.set('codikaExecutionSecret', response.executionSecret as string);
					executionContext.customData.set('codikaStartTimeMs', String(startTimeMs));
				}
			} catch {
				// Execution context not available - will fall back to expression evaluation
			}
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
