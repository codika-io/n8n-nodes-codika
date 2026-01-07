"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaWorkflowError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
class CodikaWorkflowError {
    constructor() {
        this.description = {
            displayName: 'Codika Workflow Error',
            name: 'codikaWorkflowError',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: 'Report workflow error',
            description: 'Report a workflow error to Codika for execution tracking',
            defaults: {
                name: 'Codika Workflow Error',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
                    required: false,
                    default: '',
                    placeholder: 'e.g., Gmail Trigger',
                    description: 'Name of the node that caused the failure (optional)',
                },
                {
                    displayName: 'Last Executed Node',
                    name: 'lastExecutedNode',
                    type: 'string',
                    required: false,
                    default: '',
                    placeholder: 'e.g., Process Data',
                    description: 'Name of the last successfully executed node (optional)',
                },
                {
                    displayName: 'Start Time (ms)',
                    name: 'startTimeMs',
                    type: 'number',
                    required: false,
                    default: 0,
                    placeholder: "={{ $('Codika Execution Init').first().json._startTimeMs }}",
                    description: 'Start time in milliseconds for execution duration calculation',
                },
            ],
        };
    }
    async execute() {
        const returnData = [];
        const executionId = this.getNodeParameter('executionId', 0);
        const executionSecret = this.getNodeParameter('executionSecret', 0);
        const errorMessage = this.getNodeParameter('errorMessage', 0);
        const errorType = this.getNodeParameter('errorType', 0);
        const failedNodeName = this.getNodeParameter('failedNodeName', 0);
        const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0);
        const startTimeMs = this.getNodeParameter('startTimeMs', 0);
        if (!executionId || !executionSecret) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing executionId or executionSecret. Ensure the Codika Execution Init node ran successfully.');
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