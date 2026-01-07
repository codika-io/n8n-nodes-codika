"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaWorkflowError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
function tryGetInitNodeData(context) {
    try {
        const expression = "$('Codika Execution Init').first().json";
        const result = context.evaluateExpression(expression, 0);
        if ((result === null || result === void 0 ? void 0 : result.executionId) && (result === null || result === void 0 ? void 0 : result.executionSecret)) {
            return {
                executionId: result.executionId,
                executionSecret: result.executionSecret,
                startTimeMs: result._startTimeMs || 0,
            };
        }
    }
    catch {
    }
    return null;
}
class CodikaWorkflowError {
    constructor() {
        this.description = {
            displayName: 'Codika Workflow Error',
            name: 'codikaWorkflowError',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: 'Report workflow error',
            description: 'Report a workflow error to Codika for execution tracking. Auto-detects execution parameters from Codika Execution Init node.',
            defaults: {
                name: 'Codika Workflow Error',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            properties: [
                {
                    displayName: 'Auto-Detection',
                    name: 'autoDetectNotice',
                    type: 'notice',
                    default: '',
                    description: 'Execution parameters (ID, secret, start time) are auto-populated from the "Codika Execution Init" node if present. You only need to configure error details.',
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
                    displayName: 'Error Message',
                    name: 'errorMessage',
                    type: 'string',
                    required: true,
                    default: '',
                    placeholder: 'e.g., Failed to process email: API timeout',
                    description: 'A descriptive error message explaining what went wrong',
                },
                {
                    displayName: 'Error Type',
                    name: 'errorType',
                    type: 'options',
                    required: true,
                    default: 'node_failure',
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
                    placeholder: 'e.g., Gmail Trigger',
                    description: 'Name of the node that caused the failure (optional)',
                },
                {
                    displayName: 'Last Executed Node',
                    name: 'lastExecutedNode',
                    type: 'string',
                    default: '',
                    placeholder: 'e.g., Process Data',
                    description: 'Name of the last successfully executed node (optional)',
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
    }
    async execute() {
        const returnData = [];
        const autoData = tryGetInitNodeData(this);
        const manualExecutionId = this.getNodeParameter('executionId', 0, '');
        const manualExecutionSecret = this.getNodeParameter('executionSecret', 0, '');
        const errorMessage = this.getNodeParameter('errorMessage', 0);
        const errorType = this.getNodeParameter('errorType', 0);
        const failedNodeName = this.getNodeParameter('failedNodeName', 0, '');
        const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0, '');
        const manualStartTimeMs = this.getNodeParameter('startTimeMs', 0, 0);
        const executionId = manualExecutionId || (autoData === null || autoData === void 0 ? void 0 : autoData.executionId) || '';
        const executionSecret = manualExecutionSecret || (autoData === null || autoData === void 0 ? void 0 : autoData.executionSecret) || '';
        const startTimeMs = manualStartTimeMs > 0 ? manualStartTimeMs : (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0;
        if (!executionId || !executionSecret) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing executionId or executionSecret.\n\n' +
                'To fix this, either:\n' +
                '1. Add a "Codika Execution Init" node earlier in your workflow (recommended), OR\n' +
                '2. Manually configure executionId and executionSecret parameters.\n\n' +
                'Note: The Init node must be named exactly "Codika Execution Init" for auto-detection to work.');
        }
        if (!errorMessage) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Error message is required.');
        }
        const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;
        const requestBody = {
            executionId,
            executionSecret,
            error: {
                message: errorMessage,
                type: errorType,
            },
        };
        if (failedNodeName) {
            requestBody.error.failedNodeName = failedNodeName;
        }
        if (lastExecutedNode) {
            requestBody.error.lastExecutedNode = lastExecutedNode;
        }
        if (executionTimeMs !== undefined) {
            requestBody.executionTimeMs = executionTimeMs;
        }
        const options = {
            method: 'POST',
            url: `${CODIKA_API_URL}/submitWorkflowError`,
            body: requestBody,
            json: true,
        };
        try {
            const response = await this.helpers.httpRequest(options);
            if (response.success !== true) {
                const apiErrorMessage = response.error || 'Unknown error';
                const errorCode = response.code || 'UNKNOWN';
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to submit workflow error: ${apiErrorMessage} (${errorCode})`);
            }
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
exports.CodikaWorkflowError = CodikaWorkflowError;
//# sourceMappingURL=CodikaWorkflowError.node.js.map