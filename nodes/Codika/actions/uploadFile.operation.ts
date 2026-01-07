import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	tryGetInitNodeData,
	validateExecutionParams,
	CODIKA_UPLOAD_URL,
} from '../shared/executionUtils';

/**
 * Helper to build multipart/form-data body without external dependencies
 */
function buildMultipartBody(
	fields: Record<string, string>,
	fileData: { name: string; buffer: Buffer; mimeType: string },
	boundary: string,
): Buffer {
	const parts: Buffer[] = [];

	// Add text fields
	for (const [key, value] of Object.entries(fields)) {
		parts.push(
			Buffer.from(
				`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="${key}"\r\n\r\n` +
					`${value}\r\n`,
			),
		);
	}

	// Add file field
	parts.push(
		Buffer.from(
			`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="file"; filename="${fileData.name}"\r\n` +
				`Content-Type: ${fileData.mimeType}\r\n\r\n`,
		),
	);
	parts.push(fileData.buffer);
	parts.push(Buffer.from('\r\n'));

	// Add closing boundary
	parts.push(Buffer.from(`--${boundary}--\r\n`));

	return Buffer.concat(parts);
}

const displayOptions = {
	show: {
		resource: ['fileManagement'],
		operation: ['uploadFile'],
	},
};

export const uploadFileDescription: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions,
		description: 'Name of the binary property containing the file to upload',
	},
	{
		displayName: 'Field Key',
		name: 'fieldKey',
		type: 'string',
		default: '',
		displayOptions,
		placeholder: 'e.g., generated_video',
		description: 'Output schema field key this file belongs to',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		displayOptions,
		placeholder: 'e.g., report.pdf',
		description: 'Custom filename (uses original if empty)',
	},
	{
		displayName: 'MIME Type',
		name: 'mimeType',
		type: 'string',
		default: '',
		displayOptions,
		placeholder: 'e.g., application/pdf',
		description: 'File MIME type (auto-detected if empty)',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		default: 300000,
		displayOptions,
		description: 'Request timeout in milliseconds (default 5 minutes for large files)',
	},
];

export async function executeUploadFile(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		// Get execution context from Init Workflow node
		const autoData = tryGetInitNodeData(this);

		// Get user-configurable parameters
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
		const fieldKey = this.getNodeParameter('fieldKey', i, '') as string;
		const fileName = this.getNodeParameter('fileName', i, '') as string;
		const mimeType = this.getNodeParameter('mimeType', i, '') as string;
		const timeout = this.getNodeParameter('timeout', i, 300000) as number;

		// Extract values from execution context
		const executionId = autoData?.executionId || '';
		const executionSecret = autoData?.executionSecret || '';

		// Validate required parameters from execution context
		validateExecutionParams(executionId, executionSecret, this);

		// Get binary data
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

		// Determine file name and mime type
		const finalFileName = fileName || binaryData.fileName || 'file';
		const finalMimeType = mimeType || binaryData.mimeType || 'application/octet-stream';

		try {
			// Build multipart/form-data request
			const boundary = `----n8nBoundary${Date.now()}`;
			const fields: Record<string, string> = {
				executionId,
				executionSecret,
			};
			if (fieldKey) {
				fields.fieldKey = fieldKey;
			}
			if (fileName) {
				fields.fileName = finalFileName;
			}
			if (mimeType) {
				fields.mimeType = finalMimeType;
			}

			const body = buildMultipartBody(
				fields,
				{ name: finalFileName, buffer, mimeType: finalMimeType },
				boundary,
			);

			// Use httpRequest with multipart body
			const response = await this.helpers.httpRequest({
				method: 'POST',
				url: CODIKA_UPLOAD_URL,
				body,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
				},
				timeout,
			});

			if (response.success !== true) {
				throw new NodeOperationError(
					this.getNode(),
					`Upload failed: ${response.error || 'Unknown error'} (${response.code || 'UNKNOWN'})`,
					{ itemIndex: i },
				);
			}

			// Return success response with document metadata
			returnData.push({
				json: {
					success: true,
					documentId: response.documentId,
					storagePath: response.storagePath,
					fileName: response.fileName,
					fileSize: response.fileSize,
					mimeType: response.mimeType,
				},
			});
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to upload file: ${(error as Error).message}`,
				{
					itemIndex: i,
					description: 'Check network connectivity and file size limits (max 100MB).',
				},
			);
		}
	}

	return [returnData];
}
