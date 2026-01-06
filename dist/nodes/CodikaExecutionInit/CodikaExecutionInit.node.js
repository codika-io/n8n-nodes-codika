"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaExecutionInit = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
class CodikaExecutionInit {
    constructor() {
        this.description = {
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
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const memberSecret = this.getNodeParameter('memberSecret', 0);
        const organizationId = this.getNodeParameter('organizationId', 0);
        const userId = this.getNodeParameter('userId', 0);
        const processInstanceId = this.getNodeParameter('processInstanceId', 0);
        const workflowId = this.getNodeParameter('workflowId', 0);
        const triggerType = this.getNodeParameter('triggerType', 0);
        if (!memberSecret || !organizationId || !userId || !processInstanceId || !workflowId || !triggerType) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing required parameters. Ensure all Codika placeholders are properly configured.');
        }
        const triggerData = items.map((item) => item.json);
        const requestBody = {
            memberSecret,
            organizationId,
            userId,
            processInstanceId,
            workflowId,
            triggerType,
            triggerData: triggerData.length === 1 ? triggerData[0] : triggerData,
        };
        const options = {
            method: 'POST',
            url: `${CODIKA_API_URL}/createWorkflowExecution`,
            body: requestBody,
            json: true,
        };
        try {
            const response = await this.helpers.httpRequest(options);
            if (response.success !== true) {
                const errorMessage = response.error || 'Unknown error';
                const errorCode = response.code || 'UNKNOWN';
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Codika execution initialization failed: ${errorMessage} (${errorCode})`, { description: 'The workflow will be aborted.' });
            }
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
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.NodeOperationError) {
                throw error;
            }
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to call Codika API: ${error.message}`, { description: 'Check network connectivity and Codika service availability.' });
        }
        return [returnData];
    }
}
exports.CodikaExecutionInit = CodikaExecutionInit;
//# sourceMappingURL=CodikaExecutionInit.node.js.map