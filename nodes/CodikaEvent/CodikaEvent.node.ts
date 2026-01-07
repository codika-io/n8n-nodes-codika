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
import { executeUploadFile } from './actions/uploadFile.operation';

export class CodikaEvent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika Event',
		name: 'codikaEvent',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Submit workflow results, report errors, or upload files to Codika. Auto-detects execution parameters from Codika Init node.',
		defaults: {
			name: 'Codika Event',
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
			case 'uploadFile':
				return executeUploadFile.call(this);
			default:
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}
	}
}
