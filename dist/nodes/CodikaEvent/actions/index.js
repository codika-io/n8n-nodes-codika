"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descriptions = void 0;
const submitResult_operation_1 = require("./submitResult.operation");
const reportError_operation_1 = require("./reportError.operation");
const uploadFile_operation_1 = require("./uploadFile.operation");
const workflowOutputsDisplayOptions = {
    show: {
        resource: ['workflowOutputs'],
    },
};
const fileManagementDisplayOptions = {
    show: {
        resource: ['fileManagement'],
    },
};
const resourceParams = [
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'Workflow Output',
                value: 'workflowOutputs',
                description: 'Submit workflow results or report errors',
            },
            {
                name: 'File Management',
                value: 'fileManagement',
                description: 'Upload files to Codika knowledge base',
            },
        ],
        default: 'workflowOutputs',
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: workflowOutputsDisplayOptions,
        options: [
            {
                name: 'Submit Result',
                value: 'submitResult',
                action: 'Submit result',
                description: 'Report successful completion with output data',
            },
            {
                name: 'Report Error',
                value: 'reportError',
                action: 'Report error',
                description: 'Report an error that occurred during execution',
            },
        ],
        default: 'submitResult',
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: fileManagementDisplayOptions,
        options: [
            {
                name: 'Upload File',
                value: 'uploadFile',
                action: 'Upload file',
                description: 'Upload a file to Codika knowledge base',
            },
        ],
        default: 'uploadFile',
    },
];
const workflowOutputsSharedParams = [
    {
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        description: 'Execution parameters (ID, secret, start time) are auto-populated from the "Codika Init" node if present. You only need to configure the operation-specific fields.',
    },
    {
        displayName: 'Execution ID',
        name: 'executionId',
        type: 'string',
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionId }}.',
    },
    {
        displayName: 'Execution Secret',
        name: 'executionSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionSecret }}.',
    },
    {
        displayName: 'Start Time (Ms)',
        name: 'startTimeMs',
        type: 'number',
        default: 0,
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave as 0 to auto-detect. Used for execution duration calculation. Manual override: ={{ $("Codika Init").first().JSON._startTimeMs }}.',
    },
];
const fileManagementSharedParams = [
    {
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions: fileManagementDisplayOptions,
        description: 'Execution parameters are auto-populated from the "Codika Init" node if present. You only need to configure the file-specific fields.',
    },
    {
        displayName: 'Execution ID',
        name: 'executionId',
        type: 'string',
        default: '',
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionId }}.',
    },
    {
        displayName: 'Execution Secret',
        name: 'executionSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionSecret }}.',
    },
    {
        displayName: 'Start Time (Ms)',
        name: 'startTimeMs',
        type: 'number',
        default: 0,
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Codika Init node',
        description: 'Leave as 0 to auto-detect. Used for tracking. Manual override: ={{ $("Codika Init").first().JSON._startTimeMs }}.',
    },
];
exports.descriptions = [
    ...resourceParams,
    ...workflowOutputsSharedParams,
    ...fileManagementSharedParams,
    ...submitResult_operation_1.submitResultDescription,
    ...reportError_operation_1.reportErrorDescription,
    ...uploadFile_operation_1.uploadFileDescription,
];
//# sourceMappingURL=index.js.map