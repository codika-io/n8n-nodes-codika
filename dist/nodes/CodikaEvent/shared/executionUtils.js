"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODIKA_UPLOAD_URL = exports.CODIKA_API_URL = void 0;
exports.tryGetInitNodeData = tryGetInitNodeData;
exports.validateExecutionParams = validateExecutionParams;
exports.resolveExecutionParams = resolveExecutionParams;
exports.makeCodikaApiRequest = makeCodikaApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
exports.CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
exports.CODIKA_UPLOAD_URL = `${exports.CODIKA_API_URL}/uploadWorkflowOutput`;
function tryGetInitNodeData(context) {
    try {
        const expression = "$('Codika Init').first().json";
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
function validateExecutionParams(executionId, executionSecret, context) {
    if (!executionId || !executionSecret) {
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), 'Missing executionId or executionSecret.\n\n' +
            'To fix this, either:\n' +
            '1. Add a "Codika Init" node earlier in your workflow (recommended), OR\n' +
            '2. Manually configure executionId and executionSecret parameters.\n\n' +
            'Note: The Init node must be named exactly "Codika Init" for auto-detection to work.');
    }
}
function resolveExecutionParams(autoData, manualExecutionId, manualExecutionSecret, manualStartTimeMs) {
    return {
        executionId: manualExecutionId || (autoData === null || autoData === void 0 ? void 0 : autoData.executionId) || '',
        executionSecret: manualExecutionSecret || (autoData === null || autoData === void 0 ? void 0 : autoData.executionSecret) || '',
        startTimeMs: manualStartTimeMs > 0 ? manualStartTimeMs : (autoData === null || autoData === void 0 ? void 0 : autoData.startTimeMs) || 0,
    };
}
async function makeCodikaApiRequest(context, endpoint, body) {
    const options = {
        method: 'POST',
        url: `${exports.CODIKA_API_URL}/${endpoint}`,
        body,
        json: true,
    };
    const response = await context.helpers.httpRequest(options);
    if (response.success !== true) {
        const errorMessage = response.error || 'Unknown error';
        const errorCode = response.code || 'UNKNOWN';
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `Codika API error: ${errorMessage} (${errorCode})`);
    }
    return response;
}
//# sourceMappingURL=executionUtils.js.map