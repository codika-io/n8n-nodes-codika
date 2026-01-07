"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitResultDescription = void 0;
exports.executeSubmitResult = executeSubmitResult;
const n8n_workflow_1 = require("n8n-workflow");
const executionUtils_1 = require("../shared/executionUtils");
const displayOptions = {
    show: {
        resource: ['workflowOutputs'],
        operation: ['submitResult'],
    },
};
exports.submitResultDescription = [
    {
        displayName: 'Result Data',
        name: 'resultData',
        type: 'json',
        required: true,
        default: '{}',
        displayOptions,
        placeholder: '{ "field1": "value1", "field2": "value2" }',
        description: 'The workflow result data as JSON object. Must match the workflow output schema.',
    },
];
async function executeSubmitResult() {
    const returnData = [];
    const autoData = (0, executionUtils_1.tryGetInitNodeData)(this);
    const resultDataRaw = this.getNodeParameter('resultData', 0);
    const executionId = (autoData === null || autoData === void 0 ? void 0 : autoData.executionId) || '';
    const executionSecret = (autoData === null || autoData === void 0 ? void 0 : autoData.executionSecret) || '';
    const startTimeMs = (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0;
    (0, executionUtils_1.validateExecutionParams)(executionId, executionSecret, this);
    let resultData;
    if (typeof resultDataRaw === 'string') {
        try {
            resultData = JSON.parse(resultDataRaw);
        }
        catch (e) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Invalid JSON in resultData: ${e.message}`);
        }
    }
    else {
        resultData = resultDataRaw;
    }
    const executionTimeMs = startTimeMs > 0 ? Date.now() - startTimeMs : undefined;
    const requestBody = {
        executionId,
        executionSecret,
        resultData,
    };
    if (executionTimeMs !== undefined) {
        requestBody.executionTimeMs = executionTimeMs;
    }
    try {
        await (0, executionUtils_1.makeCodikaApiRequest)(this, 'submitWorkflowResult', requestBody);
        returnData.push({
            json: {
                success: true,
                executionId,
                submittedAt: new Date().toISOString(),
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
//# sourceMappingURL=submitResult.operation.js.map