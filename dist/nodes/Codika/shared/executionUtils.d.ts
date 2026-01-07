import type { IExecuteFunctions } from 'n8n-workflow';
export declare const CODIKA_API_URL = "https://europe-west1-codika-app.cloudfunctions.net";
export declare const CODIKA_UPLOAD_URL = "https://europe-west1-codika-app.cloudfunctions.net/uploadWorkflowOutput";
export interface ExecutionData {
    executionId: string;
    executionSecret: string;
    startTimeMs: number;
}
export declare function tryGetInitNodeData(context: IExecuteFunctions, itemIndex?: number): ExecutionData | null;
export declare function validateExecutionParams(executionId: string, executionSecret: string, context: IExecuteFunctions): void;
export declare function makeCodikaApiRequest(context: IExecuteFunctions, endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
