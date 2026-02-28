# TODO

## Hardcode `submitEmbeddingResult` callback URL in Ingestion Callback node

**Priority:** Low (not broken, but inconsistent)

Currently the Ingestion Callback node receives its callback URL dynamically through the webhook payload (`callback_url` field), passed from the Firestore trigger cloud function (`onProcessKnowledgeDocumentParsed`). The node blindly POSTs to whatever URL it received.

The other callback nodes hardcode the Codika API URL directly:

| Node | URL source |
|------|-----------|
| Submit Result | Hardcoded: `CODIKA_API_URL/submitWorkflowResult` |
| Report Error | Hardcoded: `CODIKA_API_URL/submitWorkflowError` |
| Ingestion Callback | Dynamic: extracted from payload → `callbackUrl` |

The callback URL is always the same endpoint (`https://europe-west1-codika-app.cloudfunctions.net/submitEmbeddingResult`), hardcoded in the cloud function's `getCallbackUrl()` helper. There's no reason for it to be dynamic.

**To fix:** Hardcode `CODIKA_API_URL/submitEmbeddingResult` in `ingestionCallback.operation.ts` (like the other nodes), and stop passing `callback_url` in the webhook payload from the Firestore triggers. This requires coordinating:

1. Update `ingestionCallback.operation.ts` to use `makeCodikaApiRequest()` with `'submitEmbeddingResult'` endpoint (like submitResult/reportError do)
2. Remove `callback_url` from payloads in `onProcessKnowledgeDocumentParsed.ts` and `onProcessInstanceKnowledgeDocumentParsed.ts`
3. Keep backward compat: fall back to `CODIKA_API_URL/submitEmbeddingResult` if `callbackUrl` is empty (so old workflows still work during rollout)
4. Publish new node version, then clean up the cloud function payload
