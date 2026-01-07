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
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        description: 'Execution parameters (ID, secret, start time) are auto-populated from the "Codika (Init Workflow)" operation if present. You only need to configure the operation-specific fields.',
    },
    {
        displayName: 'Execution ID',
        name: 'executionId',
        type: 'string',
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika").first().JSON.executionId }}.',
    },
    {
        displayName: 'Execution Secret',
        name: 'executionSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika").first().JSON.executionSecret }}.',
    },
    {
        displayName: 'Start Time (Ms)',
        name: 'startTimeMs',
        type: 'number',
        default: 0,
        displayOptions: workflowOutputsDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave as 0 to auto-detect. Used for execution duration calculation. Manual override: ={{ $("Codika").first().JSON._startTimeMs }}.',
    },
];
const fileManagementSharedParams = [
    {
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions: fileManagementDisplayOptions,
        description: 'Execution parameters are auto-populated from the "Codika (Init Workflow)" operation if present. You only need to configure the file-specific fields.',
    },
    {
        displayName: 'Execution ID',
        name: 'executionId',
        type: 'string',
        default: '',
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika").first().JSON.executionId }}.',
    },
    {
        displayName: 'Execution Secret',
        name: 'executionSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect. Manual override: ={{ $("Codika").first().JSON.executionSecret }}.',
    },
    {
        displayName: 'Start Time (Ms)',
        name: 'startTimeMs',
        type: 'number',
        default: 0,
        displayOptions: fileManagementDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave as 0 to auto-detect. Used for tracking. Manual override: ={{ $("Codika").first().JSON._startTimeMs }}.',
    },
];
const errorHandlingSharedParams = [
    {
        displayName: 'Auto-Detection',
        name: 'autoDetectNotice',
        type: 'notice',
        default: '',
        displayOptions: errorHandlingDisplayOptions,
        description: 'Execution parameters are auto-populated from the "Codika (Init Workflow)" operation if present',
    },
    {
        displayName: 'Execution ID',
        name: 'executionId',
        type: 'string',
        default: '',
        displayOptions: errorHandlingDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect',
    },
    {
        displayName: 'Execution Secret',
        name: 'executionSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: errorHandlingDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave empty to auto-detect',
    },
    {
        displayName: 'Start Time (Ms)',
        name: 'startTimeMs',
        type: 'number',
        default: 0,
        displayOptions: errorHandlingDisplayOptions,
        placeholder: 'Auto-detected from Init operation',
        description: 'Leave as 0 to auto-detect',
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