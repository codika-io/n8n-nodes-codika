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
    const manualExecutionId = this.getNodeParameter('executionId', 0, '');
    const manualExecutionSecret = this.getNodeParameter('executionSecret', 0, '');
    const resultDataRaw = this.getNodeParameter('resultData', 0);
    const manualStartTimeMs = this.getNodeParameter('startTimeMs', 0, 0);
    const { executionId, executionSecret, startTimeMs } = (0, executionUtils_1.resolveExecutionParams)(autoData, manualExecutionId, manualExecutionSecret, manualStartTimeMs);
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
        result: resultData,
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
//# sourceMappingURL=submitResult.operation.js.map