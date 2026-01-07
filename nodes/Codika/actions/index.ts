import type { INodeProperties } from 'n8n-workflow';

// Initialize Execution operations
import { initWorkflowDescription } from './initWorkflow.operation';
import { initDataIngestionDescription } from './initDataIngestion.operation';

// Workflow Outputs operations
import { submitResultDescription } from './submitResult.operation';
import { uploadFileDescription } from './uploadFile.operation';

// Data Ingestion operations
import { ingestionCallbackDescription } from './ingestionCallback.operation';

// Error Handling operations
import { reportErrorDescription } from './reportError.operation';

/**
 * Display options for Initialize Execution resource
 */
const initializeExecutionDisplayOptions = {
	show: {
		resource: ['initializeExecution'],
	},
};

/**
 * Display options for Workflow Outputs resource
 */
const workflowOutputsDisplayOptions = {
	show: {
		resource: ['workflowOutputs'],
	},
};

/**
 * Display options for File Management resource
 */
const fileManagementDisplayOptions = {
	show: {
		resource: ['fileManagement'],
	},
};

/**
 * Display options for Data Ingestion resource
 */
const dataIngestionDisplayOptions = {
	show: {
		resource: ['dataIngestion'],
	},
};

/**
 * Display options for Error Handling resource
 */
const errorHandlingDisplayOptions = {
	show: {
		resource: ['errorHandling'],
	},
};

/**
 * Resource selector and operations
 */
const resourceParams: INodeProperties[] = [
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
	// Initialize Execution operations
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
	// Workflow Outputs operations
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
	// File Management operations
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
	// Data Ingestion operations
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
	// Error Handling operations
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

/**
 * Shared parameters for Workflow Outputs operations (Submit Result)
 */
const workflowOutputsSharedParams: INodeProperties[] = [
	{
		displayName:
			'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
			'That operation captures the execution ID and secret from the webhook payload, which are needed here to submit results back to Codika.',
		name: 'requiresInitNotice',
		type: 'notice',
		default: '',
		displayOptions: workflowOutputsDisplayOptions,
	},
];

/**
 * Shared parameters for File Management operations
 */
const fileManagementSharedParams: INodeProperties[] = [
	{
		displayName:
			'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
			'That operation captures the execution ID and secret from the webhook payload, which are needed here to upload files.',
		name: 'requiresInitNotice',
		type: 'notice',
		default: '',
		displayOptions: fileManagementDisplayOptions,
	},
];

/**
 * Shared parameters for Error Handling operations
 */
const errorHandlingSharedParams: INodeProperties[] = [
	{
		displayName:
			'This operation requires a <strong>Codika node with "Init Workflow" operation</strong> earlier in your workflow. ' +
			'That operation captures the execution ID and secret from the webhook payload, which are needed here to report errors back to Codika.',
		name: 'requiresInitNotice',
		type: 'notice',
		default: '',
		displayOptions: errorHandlingDisplayOptions,
	},
];

/**
 * Combined descriptions for all resources and operations
 */
export const descriptions: INodeProperties[] = [
	...resourceParams,
	// Initialize Execution operations
	...initWorkflowDescription,
	...initDataIngestionDescription,
	// Workflow Outputs shared params and operations
	...workflowOutputsSharedParams,
	...submitResultDescription,
	// File Management shared params and operations
	...fileManagementSharedParams,
	...uploadFileDescription,
	// Data Ingestion operations (has its own params)
	...ingestionCallbackDescription,
	// Error Handling shared params and operations
	...errorHandlingSharedParams,
	...reportErrorDescription,
];
