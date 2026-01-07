"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportErrorDescription = void 0;
exports.executeReportError = executeReportError;
const n8n_workflow_1 = require("n8n-workflow");
const executionUtils_1 = require("../shared/executionUtils");
const displayOptions = {
    show: {
        resource: ['errorHandling'],
        operation: ['reportError'],
    },
};
exports.reportErrorDescription = [
    {
        displayName: 'Error Message',
        name: 'errorMessage',
        type: 'string',
        required: true,
        default: '',
        displayOptions,
        placeholder: 'e.g., Failed to process email: API timeout',
        description: 'A descriptive error message explaining what went wrong',
    },
    {
        displayName: 'Error Type',
        name: 'errorType',
        type: 'options',
        required: true,
        default: 'node_failure',
        displayOptions,
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
        displayOptions,
        placeholder: 'e.g., Gmail Trigger',
        description: 'Name of the node that caused the failure (optional)',
    },
    {
        displayName: 'Last Executed Node',
        name: 'lastExecutedNode',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: 'e.g., Process Data',
        description: 'Name of the last successfully executed node (optional)',
    },
];
async function executeReportError() {
    const returnData = [];
    const autoData = (0, executionUtils_1.tryGetInitNodeData)(this);
    const errorMessage = this.getNodeParameter('errorMessage', 0);
    const errorType = this.getNodeParameter('errorType', 0);
    const failedNodeName = this.getNodeParameter('failedNodeName', 0, '');
    const lastExecutedNode = this.getNodeParameter('lastExecutedNode', 0, '');
    const executionId = (autoData === null || autoData === void 0 ? void 0 : autoData.executionId) || '';
    const executionSecret = (autoData === null || autoData === void 0 ? void 0 : autoData.executionSecret) || '';
    const startTimeMs = (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0;
    (0, executionUtils_1.validateExecutionParams)(executionId, executionSecret, this);
    if (!errorMessage) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Error message is required.');
    }
    const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;
    const requestBody = {
        executionId,
        executionSecret,
        errorType,
        errorMessage,
    };
    if (failedNodeName) {
        requestBody.failedNodeName = failedNodeName;
    }
    if (lastExecutedNode) {
        requestBody.lastExecutedNode = lastExecutedNode;
    }
    if (executionTimeMs !== undefined) {
        requestBody.executionTimeMs = executionTimeMs;
    }
    try {
        await (0, executionUtils_1.makeCodikaApiRequest)(this, 'submitWorkflowError', requestBody);
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
//# sourceMappingURL=reportError.operation.js.map