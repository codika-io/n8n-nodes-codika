import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

export class CodikaExecutionInit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Execution Init',
		name: 'codikaExecutionInit',
		icon: { light: 'file:codika.svg', dark: 'file:codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Initialize workflow execution',
		description: 'Initialize a Codika workflow execution for third-party triggers (Gmail, Calendly, etc.)',
		defaults: {
			name: 'Codika Execution Init',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Member Secret',
				name: 'memberSecret',
				type: 'string',
				required: true,
				typeOptions: { password: true },
				default: '',
				description: 'Codika member execution auth secret (use placeholder: {{MEMSECRT_EXECUTION_AUTH_TRCESMEM}})',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				required: true,
				default: '',
				description: 'Codika organization ID (use placeholder: {{USERDATA_ORGANIZATION_ID_ATADRESU}})',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				default: '',
				description: 'Codika user ID (use placeholder: {{USERDATA_USER_ID_ATADRESU}})',
			},
			{
				displayName: 'Process Instance ID',
				name: 'processInstanceId',
				type: 'string',
				required: true,
				default: '',
				description: 'Codika process instance ID (use placeholder: {{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}})',
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., gmail-draft-assistant',
				description: 'The workflow template ID',
			},
			{
				displayName: 'Trigger Type',
				name: 'triggerType',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., gmail, calendly, schedule',
				description: 'The type of trigger that initiated this workflow',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get parameters (same for all items, placeholders replaced at deployment)
		const memberSecret = this.getNodeParameter('memberSecret', 0) as string;
		const organizationId = this.getNodeParameter('organizationId', 0) as string;
		const userId = this.getNodeParameter('userId', 0) as string;
		const processInstanceId = this.getNodeParameter('processInstanceId', 0) as string;
		const workflowId = this.getNodeParameter('workflowId', 0) as string;
		const triggerType = this.getNodeParameter('triggerType', 0) as string;

		// Validate required parameters
		if (!memberSecret || !organizationId || !userId || !processInstanceId || !workflowId || !triggerType) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing required parameters. Ensure all Codika placeholders are properly configured.',
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
					userId: response.userId,
					_startTimeMs: Date.now(),
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
