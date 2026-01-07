"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaWorkflowResult = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const CODIKA_API_URL = 'https://europe-west1-codika-app.cloudfunctions.net';
class CodikaWorkflowResult {
    constructor() {
        this.description = {
            displayName: 'Codika Workflow Result',
            name: 'codikaWorkflowResult',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: 'Submit workflow result',
            description: 'Submit the workflow result to Codika for execution tracking',
            defaults: {
                name: 'Codika Workflow Result',
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
                    displayName: 'Result Data',
                    name: 'resultData',
                    type: 'json',
                    required: true,
                    default: '{}',
                    placeholder: '{ "field1": "value1", "field2": "value2" }',
                    description: 'The workflow result data as JSON object. Must match the workflow output schema.',
                },
                {
                    displayName: 'Start Time (ms)',
                    name: 'startTimeMs',
                    type: 'number',
                    required: false,
                    default: 0,
                    placeholder: "={{ $('Codika Execution Init').first().json._startTimeMs }}",
                    description: 'Start time in milliseconds for execution duration calculation. If provided, executionTimeMs will be calculated automatically.',
                },
            ],
        };
    }
    async execute() {
        const returnData = [];
        const executionId = this.getNodeParameter('executionId', 0);
        const executionSecret = this.getNodeParameter('executionSecret', 0);
        const resultDataRaw = this.getNodeParameter('resultData', 0);
        const startTimeMs = this.getNodeParameter('startTimeMs', 0);
        if (!executionId || !executionSecret) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing executionId or executionSecret. Ensure the Codika Execution Init node ran successfully.');
        }
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
        const options = {
            method: 'POST',
            url: `${CODIKA_API_URL}/submitWorkflowResult`,
            body: requestBody,
            json: true,
        };
        try {
            const response = await this.helpers.httpRequest(options);
            if (response.success !== true) {
                const errorMessage = response.error || 'Unknown error';
                const errorCode = response.code || 'UNKNOWN';
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to submit workflow result: ${errorMessage} (${errorCode})`);
            }
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
}
exports.CodikaWorkflowResult = CodikaWorkflowResult;
//# sourceMappingURL=CodikaWorkflowResult.node.js.map