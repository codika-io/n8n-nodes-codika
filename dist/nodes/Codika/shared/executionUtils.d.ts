import type { IExecuteFunctions } from 'n8n-workflow';
export declare const CODIKA_API_URL: string;
export declare const CODIKA_UPLOAD_URL: string;
export interface ExecutionData {
    executionId: string;
    executionSecret: string;
    startTimeMs: number;
}
export declare function getN8nExecutionId(context: IExecuteFunctions, itemIndex?: number): string | undefined;
export declare function tryGetInitNodeData(context: IExecuteFunctions, itemIndex?: number): ExecutionData | null;
export declare function validateExecutionParams(executionId: string, executionSecret: string, context: IExecuteFunctions): void;
export declare function makeCodikaApiRequest(context: IExecuteFunctions, endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
