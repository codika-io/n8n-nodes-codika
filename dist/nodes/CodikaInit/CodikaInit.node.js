"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaInit = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
function tryExtractHttpTriggerMetadata(inputData) {
    var _a;
    if (!inputData || inputData.length === 0) {
        return null;
    }
    const firstItem = (_a = inputData[0]) === null || _a === void 0 ? void 0 : _a.json;
    if (!firstItem) {
        return null;
    }
    const bodyData = firstItem.body || firstItem;
    const metadata = bodyData.executionMetadata;
    if ((metadata === null || metadata === void 0 ? void 0 : metadata.executionId) && (metadata === null || metadata === void 0 ? void 0 : metadata.executionSecret) && (metadata === null || metadata === void 0 ? void 0 : metadata.callbackUrl)) {
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
class CodikaInit {
    constructor() {
        this.description = {
            displayName: 'Codika Init',
            name: 'codikaInit',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: 'Initialize workflow execution',
            description: 'Initialize a Codika workflow execution. Auto-detects HTTP triggers (passthrough) vs Schedule/Service triggers (creates execution via API).',
            defaults: {
                name: 'Codika Init',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            properties: [
                {
                    displayName: 'Mode Detection',
                    name: 'modeNotice',
                    type: 'notice',
                    default: '',
                    description: 'This node auto-detects the trigger type. For HTTP triggers (from Codika UI), it extracts execution metadata from the payload (passthrough mode). For other triggers (schedule, Gmail, etc.), it creates a new execution via API using the parameters below.',
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const startTimeMs = Date.now();
        const httpTriggerMetadata = tryExtractHttpTriggerMetadata(items);
        if (httpTriggerMetadata) {
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
            return [returnData];
        }
        const memberSecret = this.getNodeParameter('memberSecret', 0, '');
        const organizationId = this.getNodeParameter('organizationId', 0, '');
        const userId = this.getNodeParameter('userId', 0, '');
        const processInstanceId = this.getNodeParameter('processInstanceId', 0, '');
        const workflowId = this.getNodeParameter('workflowId', 0, '');
        const triggerType = this.getNodeParameter('triggerType', 0, '');
        if (!memberSecret ||
            !organizationId ||
            !userId ||
            !processInstanceId ||
            !workflowId ||
            !triggerType) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing required parameters for non-HTTP trigger mode.\n\n' +
                'If this is an HTTP trigger workflow, ensure the webhook payload contains executionMetadata.\n\n' +
                'If this is a schedule/service trigger workflow, configure all parameters:\n' +
                '- Member Secret ({{MEMSECRT_EXECUTION_AUTH_TRCESMEM}})\n' +
                '- Organization ID ({{USERDATA_ORGANIZATION_ID_ATADRESU}})\n' +
                '- User ID ({{USERDATA_USER_ID_ATADRESU}})\n' +
                '- Process Instance ID ({{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}})\n' +
                '- Workflow ID\n' +
                '- Trigger Type');
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
                    processInstanceId: processInstanceId,
                    userId: response.userId,
                    workflowId: workflowId,
                    _startTimeMs: startTimeMs,
                    _mode: 'create',
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
exports.CodikaInit = CodikaInit;
//# sourceMappingURL=CodikaInit.node.js.map