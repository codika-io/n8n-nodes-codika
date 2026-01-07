"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descriptions = void 0;
const initWorkflow_operation_1 = require("./initWorkflow.operation");
const initDataIngestion_operation_1 = require("./initDataIngestion.operation");
const submitResult_operation_1 = require("./submitResult.operation");
const uploadFile_operation_1 = require("./uploadFile.operation");
const ingestionCallback_operation_1 = require("./ingestionCallback.operation");
const reportError_operation_1 = require("./reportError.operation");
const initializeExecutionDisplayOptions = {
    show: {
        resource: ['initializeExecution'],
    },
};
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
const dataIngestionDisplayOptions = {
    show: {
        resource: ['dataIngestion'],
    },
};
const errorHandlingDisplayOptions = {
    show: {
        resource: ['errorHandling'],
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
                name: 'Data Ingestion',
                value: 'dataIngestion',
                description: 'Report data ingestion status',
            },
            {
                name: 'Error Handling',
                value: 'errorHandling',
                description: 'Report workflow errors',
            },
            {
                name: 'File Management',
                value: 'fileManagement',
                description: 'Upload files to Codika storage',
            },
            {
                name: 'Initialize Execution',
                value: 'initializeExecution',
                description: 'Initialize workflow or data ingestion execution',
            },
            {
                name: 'Workflow Output',
                value: 'workflowOutputs',
                description: 'Submit workflow results',
            },
        ],
        default: 'initializeExecution',
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: initializeExecutionDisplayOptions,
        options: [
            {
                name: 'Init Workflow',
                value: 'initWorkflow',
                action: 'Initialize workflow execution',
                description: 'Initialize a regular workflow execution (HTTP trigger or schedule/service)',
            },
            {
                name: 'Init Data Ingestion',
                value: 'initDataIngestion',
                action: 'Initialize data ingestion',
                description: 'Initialize a RAG data ingestion workflow (document embedding)',
            },
        ],
        default: 'initWorkflow',
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
                description: 'Upload a file to Codika storage',
            },
        ],
        default: 'uploadFile',
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: dataIngestionDisplayOptions,
        options: [
            {
                name: 'Ingestion Callback',
                value: 'ingestionCallback',
                action: 'Report ingestion status',
                description: 'Report data ingestion completion status (success/failed/skipped)',
            },
        ],
        default: 'ingestionCallback',
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: errorHandlingDisplayOptions,
        options: [
            {
                name: 'Report Error',
                value: 'reportError',
                action: 'Report error',
                description: 'Report an error that occurred during execution',
            },
        ],
        default: 'reportError',
    },
];
const workflowOutputsSharedParams = [
    {
        displayName: 'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
            'That operation captures the execution ID and secret from the webhook payload, which are needed here to submit results back to Codika.',
        name: 'requiresInitNotice',
        type: 'notice',
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
    },
];
const fileManagementSharedParams = [
    {
        displayName: 'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
            'That operation captures the execution ID and secret from the webhook payload, which are needed here to upload files.',
        name: 'requiresInitNotice',
        type: 'notice',
        default: '',
        displayOptions: fileManagementDisplayOptions,
    },
];
const errorHandlingSharedParams = [
    {
        displayName: 'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
            'That operation captures the execution ID and secret from the webhook payload, which are needed here to report errors back to Codika.',
        name: 'requiresInitNotice',
        type: 'notice',
        default: '',
        displayOptions: errorHandlingDisplayOptions,
    },
];
exports.descriptions = [
    ...resourceParams,
    ...initWorkflow_operation_1.initWorkflowDescription,
    ...initDataIngestion_operation_1.initDataIngestionDescription,
    ...workflowOutputsSharedParams,
    ...submitResult_operation_1.submitResultDescription,
    ...fileManagementSharedParams,
    ...uploadFile_operation_1.uploadFileDescription,
    ...ingestionCallback_operation_1.ingestionCallbackDescription,
    ...errorHandlingSharedParams,
    ...reportError_operation_1.reportErrorDescription,
];
//# sourceMappingURL=index.js.map