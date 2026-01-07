import type { INodeProperties } from 'n8n-workflow';
import { submitResultDescription } from './submitResult.operation';
import { reportErrorDescription } from './reportError.operation';

/**
 * Display options for Workflow Outputs resource
 */
const workflowOutputsDisplayOptions = {
	show: {
		resource: ['workflowOutputs'],
	},
};

/**
 * Resource and shared parameters
 */
const resourceParams: INodeProperties[] = [
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
];

/**
 * Shared parameters for all Workflow Outputs operations
 */
const sharedParams: INodeProperties[] = [
	{
		displayName: 'Auto-Detection',
		name: 'autoDetectNotice',
		type: 'notice',
		default: '',
		displayOptions: workflowOutputsDisplayOptions,
		description:
			'Execution parameters (ID, secret, start time) are auto-populated from the "Codika Init" node if present. You only need to configure the operation-specific fields.',
	},
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'string',
		default: '',
		displayOptions: workflowOutputsDisplayOptions,
		placeholder: 'Auto-detected from Codika Init node',
		description:
			'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionId }}.',
	},
	{
		displayName: 'Execution Secret',
		name: 'executionSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: workflowOutputsDisplayOptions,
		placeholder: 'Auto-detected from Codika Init node',
		description:
			'Leave empty to auto-detect. Manual override: ={{ $("Codika Init").first().JSON.executionSecret }}.',
	},
	{
		displayName: 'Start Time (Ms)',
		name: 'startTimeMs',
		type: 'number',
		default: 0,
		displayOptions: workflowOutputsDisplayOptions,
		placeholder: 'Auto-detected from Codika Init node',
		description:
			'Leave as 0 to auto-detect. Used for execution duration calculation. Manual override: ={{ $("Codika Init").first().JSON._startTimeMs }}.',
	},
];

/**
 * Combined descriptions for all resources and operations
 */
export const descriptions: INodeProperties[] = [
	...resourceParams,
	...sharedParams,
	...submitResultDescription,
	...reportErrorDescription,
];
