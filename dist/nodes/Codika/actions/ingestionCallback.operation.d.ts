import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
export declare const ingestionCallbackDescription: INodeProperties[];
export declare function executeIngestionCallback(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
