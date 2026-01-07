"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODIKA_UPLOAD_URL = exports.CODIKA_API_URL = void 0;
exports.tryGetInitNodeData = tryGetInitNodeData;
exports.validateExecutionParams = validateExecutionParams;
exports.makeCodikaApiRequest = makeCodikaApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
exports.CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
exports.CODIKA_UPLOAD_URL = `${exports.CODIKA_API_URL}/uploadWorkflowOutput`;
function tryGetInitNodeData(context, itemIndex = 0) {
    var _a;
    try {
        const proxy = context.getWorkflowDataProxy(itemIndex);
        const customData = (_a = proxy.$execution) === null || _a === void 0 ? void 0 : _a.customData;
        if (customData) {
            const executionId = customData.get('codikaExecutionId');
            const executionSecret = customData.get('codikaExecutionSecret');
            const startTimeMs = customData.get('codikaStartTimeMs');
            if (executionId && executionSecret) {
                return {
                    executionId,
                    executionSecret,
                    startTimeMs: startTimeMs ? parseInt(startTimeMs, 10) : 0,
                };
            }
        }
    }
    catch {
    }
    const nodeNames = ['Codika', 'Codika Init'];
    for (const nodeName of nodeNames) {
        try {
            const expression = `$('${nodeName}').first().json`;
            const result = context.evaluateExpression(expression, itemIndex);
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
    }
    return null;
}
function validateExecutionParams(executionId, executionSecret, context) {
    if (!executionId || !executionSecret) {
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), 'Missing execution context: executionId or executionSecret not found.\n\n' +
            'This operation requires a "Codika > Init Workflow" node earlier in your workflow.\n' +
            'The Init Workflow node extracts these values from the webhook payload and stores them in the execution context.');
    }
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