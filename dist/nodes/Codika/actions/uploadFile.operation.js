"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileDescription = void 0;
exports.executeUploadFile = executeUploadFile;
const n8n_workflow_1 = require("n8n-workflow");
const executionUtils_1 = require("../shared/executionUtils");
function buildMultipartBody(fields, fileData, boundary) {
    const parts = [];
    for (const [key, value] of Object.entries(fields)) {
        parts.push(Buffer.from(`--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
            `${value}\r\n`));
    }
    parts.push(Buffer.from(`--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileData.name}"\r\n` +
        `Content-Type: ${fileData.mimeType}\r\n\r\n`));
    parts.push(fileData.buffer);
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    return Buffer.concat(parts);
}
const displayOptions = {
    show: {
        resource: ['fileManagement'],
        operation: ['uploadFile'],
    },
};
exports.uploadFileDescription = [
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
    {
        displayName: 'Execution ID (Override)',
        name: 'executionIdOverride',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: '={{ $json.executionId }}',
        description: 'Override auto-detected executionId (for use in subworkflows where executionId is passed as input)',
    },
    {
        displayName: 'Execution Secret (Override)',
        name: 'executionSecretOverride',
        type: 'string',
        default: '',
        displayOptions,
        placeholder: '={{ $json.executionSecret }}',
        description: 'Override auto-detected executionSecret (for use in subworkflows where executionSecret is passed as input)',
    },
];
async function executeUploadFile() {
    const returnData = [];
    const items = this.getInputData();
    for (let i = 0; i < items.length; i++) {
        const autoData = (0, executionUtils_1.tryGetInitNodeData)(this);
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
        const fieldKey = this.getNodeParameter('fieldKey', i, '');
        const fileName = this.getNodeParameter('fileName', i, '');
        const mimeType = this.getNodeParameter('mimeType', i, '');
        const timeout = this.getNodeParameter('timeout', i, 300000);
        const executionIdOverride = this.getNodeParameter('executionIdOverride', i, '');
        const executionSecretOverride = this.getNodeParameter('executionSecretOverride', i, '');
        const executionId = executionIdOverride || (autoData === null || autoData === void 0 ? void 0 : autoData.executionId) || '';
        const executionSecret = executionSecretOverride || (autoData === null || autoData === void 0 ? void 0 : autoData.executionSecret) || '';
        (0, executionUtils_1.validateExecutionParams)(executionId, executionSecret, this);
        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
        const finalFileName = fileName || binaryData.fileName || 'file';
        const finalMimeType = mimeType || binaryData.mimeType || 'application/octet-stream';
        try {
            const boundary = `----n8nBoundary${Date.now()}`;
            const fields = {
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
            const body = buildMultipartBody(fields, { name: finalFileName, buffer, mimeType: finalMimeType }, boundary);
            const response = await this.helpers.httpRequest({
                method: 'POST',
                url: executionUtils_1.CODIKA_UPLOAD_URL,
                body,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                timeout,
            });
            if (response.success !== true) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Upload failed: ${response.error || 'Unknown error'} (${response.code || 'UNKNOWN'})`, { itemIndex: i });
            }
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
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.NodeOperationError) {
                throw error;
            }
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to upload file: ${error.message}`, {
                itemIndex: i,
                description: 'Check network connectivity and file size limits (max 100MB).',
            });
        }
    }
    return [returnData];
}
//# sourceMappingURL=uploadFile.operation.js.map