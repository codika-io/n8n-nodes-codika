# Codika Workflow Error Node

## Purpose

This node reports workflow errors to Codika's tracking system. Use it on error paths in any workflow that requires execution tracking.

## When to Use

| Workflow Type | Use This Node? |
|---------------|----------------|
| Non-HTTP triggers (schedule, service_event) | **Yes** - on error paths |
| HTTP triggers (webhooks from Codika UI) | **Yes** - on error paths |
| Sub-workflows | No - parent workflow handles error tracking |

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `executionId` | Yes | Execution ID from Codika Execution Init or webhook payload |
| `executionSecret` | Yes | Authentication secret |
| `errorMessage` | Yes | Descriptive error message |
| `errorType` | Yes | Error category (see table below) |
| `failedNodeName` | No | Name of the node that caused the failure |
| `lastExecutedNode` | No | Name of the last successfully executed node |
| `startTimeMs` | No | Start time for duration calculation |

## Error Types

| Value | Use When |
|-------|----------|
| `node_failure` | A workflow node failed to execute |
| `validation_error` | Input data failed validation |
| `external_api_error` | An external service (API, database) returned an error |
| `timeout` | The operation exceeded time limits |

## Output

On success, the node outputs:

```json
{
  "success": true,
  "executionId": "01234567-89ab-cdef-0123-456789abcdef",
  "reportedAt": "2024-01-15T10:30:00.000Z",
  "errorType": "node_failure",
  "executionTimeMs": 1523
}
```

## Error Handling

- **On success**: Returns confirmation (does NOT throw - this node IS the error handler)
- **On API failure**: Throws a `NodeOperationError` if unable to report to Codika

## Usage

### Workflow Structure

```
Trigger
    |
Codika Execution Init
    |
Main Business Logic
    |
+---+---+
|       |
Success Error Branch
|       |
Codika  Codika
Result  Workflow Error  <-- This node
```

### Node JSON Example

```json
{
  "parameters": {
    "executionId": "={{ $('Codika Execution Init').first().json.executionId }}",
    "executionSecret": "={{ $('Codika Execution Init').first().json.executionSecret }}",
    "errorMessage": "={{ $json.error?.message || 'Unknown error occurred' }}",
    "errorType": "node_failure",
    "failedNodeName": "={{ $json.error?.node?.name || '' }}",
    "lastExecutedNode": "",
    "startTimeMs": "={{ $('Codika Execution Init').first().json._startTimeMs }}"
  },
  "name": "Codika Workflow Error",
  "type": "n8n-nodes-codika.codikaWorkflowError",
  "typeVersion": 1,
  "position": [1200, 500]
}
```

### Dynamic Error Type Selection

For more granular error reporting, determine the error type dynamically:

```json
{
  "parameters": {
    "executionId": "={{ $('Codika Execution Init').first().json.executionId }}",
    "executionSecret": "={{ $('Codika Execution Init').first().json.executionSecret }}",
    "errorMessage": "={{ $json.error?.message || 'Unknown error' }}",
    "errorType": "={{ $json.error?.message?.includes('timeout') ? 'timeout' : $json.error?.message?.includes('API') ? 'external_api_error' : 'node_failure' }}",
    "startTimeMs": "={{ $('Codika Execution Init').first().json._startTimeMs }}"
  },
  "name": "Codika Workflow Error",
  "type": "n8n-nodes-codika.codikaWorkflowError",
  "typeVersion": 1
}
```

### For HTTP Trigger Workflows

When using HTTP triggers, reference execution metadata from the webhook payload:

```json
{
  "parameters": {
    "executionId": "={{ $('Process Input').first().json.executionId }}",
    "executionSecret": "={{ $('Process Input').first().json.executionSecret }}",
    "errorMessage": "={{ $json.error?.message || 'Workflow failed' }}",
    "errorType": "node_failure",
    "startTimeMs": "={{ $('Process Input').first().json._startTimeMs }}"
  },
  "name": "Codika Workflow Error",
  "type": "n8n-nodes-codika.codikaWorkflowError",
  "typeVersion": 1
}
```

## Internal Implementation

This node internally:

1. Validates required parameters (executionId, executionSecret, errorMessage)
2. Calculates executionTimeMs if startTimeMs was provided
3. Builds error payload with optional context (failedNodeName, lastExecutedNode)
4. Makes a POST request to `https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowError`
5. Validates the response (`success === true`)
6. Returns confirmation on success
7. Throws error only if unable to communicate with Codika API

## API Endpoint

**URL:** `POST https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowError`

**Request Body:**

```json
{
  "executionId": "string",
  "executionSecret": "string",
  "error": {
    "message": "Error description",
    "type": "node_failure",
    "failedNodeName": "Gmail Trigger",
    "lastExecutedNode": "Process Data"
  },
  "executionTimeMs": 1523
}
```

## Difference from Error Workflow

This node is for **explicit error handling** within your workflow logic. The organization-level error workflow (`errorWorkflow` setting) catches **unhandled exceptions**. Use both for complete error coverage:

- **Codika Workflow Error node**: For errors you catch and handle explicitly
- **Error Workflow setting**: For unexpected crashes and unhandled exceptions
