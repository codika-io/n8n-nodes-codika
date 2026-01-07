"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Codika = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const actions_1 = require("./actions");
const initWorkflow_operation_1 = require("./actions/initWorkflow.operation");
const initDataIngestion_operation_1 = require("./actions/initDataIngestion.operation");
const submitResult_operation_1 = require("./actions/submitResult.operation");
const uploadFile_operation_1 = require("./actions/uploadFile.operation");
const ingestionCallback_operation_1 = require("./actions/ingestionCallback.operation");
const reportError_operation_1 = require("./actions/reportError.operation");
class Codika {
    constructor() {
        this.description = {
            displayName: 'Codika',
            name: 'codika',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
            description: 'Interact with Codika platform - initialize executions, submit results, upload files, handle errors, and manage data ingestion.',
            defaults: {
                name: 'Codika',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            properties: actions_1.descriptions,
        };
    }
    async execute() {
        const operation = this.getNodeParameter('operation', 0);
        switch (operation) {
            case 'initWorkflow':
                return initWorkflow_operation_1.executeInitWorkflow.call(this);
            case 'initDataIngestion':
                return initDataIngestion_operation_1.executeInitDataIngestion.call(this);
            case 'submitResult':
                return submitResult_operation_1.executeSubmitResult.call(this);
            case 'uploadFile':
                return uploadFile_operation_1.executeUploadFile.call(this);
            case 'ingestionCallback':
                return ingestionCallback_operation_1.executeIngestionCallback.call(this);
            case 'reportError':
                return reportError_operation_1.executeReportError.call(this);
            default:
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }
    }
}
exports.Codika = Codika;
//# sourceMappingURL=Codika.node.js.map