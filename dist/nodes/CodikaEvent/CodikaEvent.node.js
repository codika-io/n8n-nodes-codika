"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodikaWorkflowEvent = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const actions_1 = require("./actions");
const submitResult_operation_1 = require("./actions/submitResult.operation");
const reportError_operation_1 = require("./actions/reportError.operation");
class CodikaWorkflowEvent {
    constructor() {
        this.description = {
            displayName: 'Codika Event',
            name: 'codikaEvent',
            icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{ $parameter["operation"] }}',
            description: 'Submit workflow results or report errors to Codika for execution tracking. Auto-detects execution parameters from Codika Init node.',
            defaults: {
                name: 'Codika Event',
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
            case 'submitResult':
                return submitResult_operation_1.executeSubmitResult.call(this);
            case 'reportError':
                return reportError_operation_1.executeReportError.call(this);
            default:
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }
    }
}
exports.CodikaWorkflowEvent = CodikaWorkflowEvent;
//# sourceMappingURL=CodikaEvent.node.js.map