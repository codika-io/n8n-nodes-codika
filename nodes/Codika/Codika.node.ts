import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { descriptions } from './actions';

// Initialize Execution operations
import { executeInitWorkflow } from './actions/initWorkflow.operation';
import { executeInitDataIngestion } from './actions/initDataIngestion.operation';

// Workflow Outputs operations
import { executeSubmitResult } from './actions/submitResult.operation';

// File Management operations
import { executeUploadFile } from './actions/uploadFile.operation';

// Data Ingestion operations
import { executeIngestionCallback } from './actions/ingestionCallback.operation';

// Error Handling operations
import { executeReportError } from './actions/reportError.operation';

export class Codika implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Codika',
		name: 'codika',
		icon: { light: 'file:../../icons/codika.svg', dark: 'file:../../icons/codika.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description:
			'Interact with Codika platform - initialize executions, submit results, upload files, handle errors, and manage data ingestion.',
		defaults: {
			name: 'Codika',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: descriptions,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

		switch (operation) {
			// Initialize Execution operations
			case 'initWorkflow':
				return executeInitWorkflow.call(this);
			case 'initDataIngestion':
				return executeInitDataIngestion.call(this);

			// Workflow Outputs operations
			case 'submitResult':
				return executeSubmitResult.call(this);

			// File Management operations
			case 'uploadFile':
				return executeUploadFile.call(this);

			// Data Ingestion operations
			case 'ingestionCallback':
				return executeIngestionCallback.call(this);

			// Error Handling operations
			case 'reportError':
				return executeReportError.call(this);

			default:
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}
	}
}
