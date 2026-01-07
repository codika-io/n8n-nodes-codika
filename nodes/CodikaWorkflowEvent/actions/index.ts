import type { INodeProperties } from 'n8n-workflow';
import { submitResultDescription } from './submitResult.operation';
import { reportErrorDescription } from './reportError.operation';

/**
 * Shared parameters that are visible for all operations
 */
const sharedParams: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Submit Result',
				value: 'submitResult',
				action: 'Submit a successful workflow result',
				description: 'Report successful completion with output data',
			},
			{
				name: 'Report Error',
				value: 'reportError',
				action: 'Report a workflow error',
				description: 'Report an error that occurred during execution',
			},
		],
		default: 'submitResult',
	},
	{
		displayName: 'Auto-Detection',
		name: 'autoDetectNotice',
		type: 'notice',
		default: '',
		description:
			'Execution parameters (ID, secret, start time) are auto-populated from the "Codika Execution Init" node if present. You only need to configure the operation-specific fields.',
	},
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'string',
		default: '',
		placeholder: 'Auto-detected from Codika Execution Init node',
		description:
			'Leave empty to auto-detect. Manual override: ={{ $("Codika Execution Init").first().JSON.executionId }}.',
	},
	{
		displayName: 'Execution Secret',
		name: 'executionSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		placeholder: 'Auto-detected from Codika Execution Init node',
		description:
			'Leave empty to auto-detect. Manual override: ={{ $("Codika Execution Init").first().JSON.executionSecret }}.',
	},
	{
		displayName: 'Start Time (Ms)',
		name: 'startTimeMs',
		type: 'number',
		default: 0,
		placeholder: 'Auto-detected from Codika Execution Init node',
		description:
			'Leave as 0 to auto-detect. Used for execution duration calculation. Manual override: ={{ $("Codika Execution Init").first().JSON._startTimeMs }}.',
	},
];

/**
 * Combined descriptions for all operations
 */
export const descriptions: INodeProperties[] = [
	...sharedParams,
	...submitResultDescription,
	...reportErrorDescription,
];
