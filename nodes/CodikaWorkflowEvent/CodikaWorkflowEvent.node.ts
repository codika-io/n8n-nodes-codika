import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { descriptions } from './actions';
import { executeSubmitResult } from './actions/submitResult.operation';
import { executeReportError } from './actions/reportError.operation';

export class CodikaWorkflowEvent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Workflow Event',
		name: 'codikaWorkflowEvent',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Submit workflow results or report errors to Codika for execution tracking. Auto-detects execution parameters from Codika Execution Init node.',
		defaults: {
			name: 'Codika Workflow Event',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: descriptions,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

		switch (operation) {
			case 'submitResult':
				return executeSubmitResult.call(this);
			case 'reportError':
				return executeReportError.call(this);
			default:
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}
	}
}
