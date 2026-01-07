# Codika Workflow Result Node

## Purpose

This node submits workflow execution results to Codika's tracking system. Use it at the end of the success path in any workflow that requires execution tracking.

## When to Use

| Workflow Type | Use This Node? |
|---------------|----------------|
| Non-HTTP triggers (schedule, service_event) | **Yes** - after Codika Execution Init |
| HTTP triggers (webhooks from Codika UI) | **Yes** - executionMetadata provided by backend |
| Sub-workflows | No - parent workflow handles tracking |

## Parameters

| Parameter | Required | Placeholder | Description |
|-----------|----------|-------------|-------------|
| `executionId` | Yes | `$('Codika Execution Init').first().json.executionId` | Execution ID for tracking |
| `executionSecret` | Yes | `$('Codika Execution Init').first().json.executionSecret` | Authentication secret |
| `resultData` | Yes | `JSON.stringify($json.result)` | Workflow output data (must match output schema) |
| `startTimeMs` | No | `$('Codika Execution Init').first().json._startTimeMs` | Start time for duration calculation |

## Output

On success, the node outputs:

```json
{
  "success": true,
  "executionId": "01234567-89ab-cdef-0123-456789abcdef",
  "submittedAt": "2024-01-15T10:30:00.000Z",
  "executionTimeMs": 1523
}
```

## Error Handling

- **On success**: Returns submission confirmation, workflow completes normally
- **On failure**: Throws a `NodeOperationError`, n8n stops the workflow

## Usage

### Workflow Structure

```
Trigger (Gmail/Calendly/Schedule or HTTP Webhook)
        |
Codika Execution Init (for non-HTTP triggers)
        |
Main Business Logic
        |
    +---+---+
    |       |
Success   Error
    |       |
Codika    Codika
Workflow  Workflow
Result    Error
```

### Node JSON Example

```json
{
  "parameters": {
    "executionId": "={{ $('Codika Execution Init').first().json.executionId }}",
    "executionSecret": "={{ $('Codika Execution Init').first().json.executionSecret }}",
    "resultData": "={{ JSON.stringify({ analysis: $json.analysis, score: $json.score }) }}",
    "startTimeMs": "={{ $('Codika Execution Init').first().json._startTimeMs }}"
  },
  "name": "Codika Workflow Result",
  "type": "n8n-nodes-codika.codikaWorkflowResult",
  "typeVersion": 1,
  "position": [1200, 300]
}
```

### For HTTP Trigger Workflows

When using HTTP triggers (webhooks from Codika UI), execution metadata comes from the webhook payload:

```json
{
  "parameters": {
    "executionId": "={{ $('Process Input').first().json.executionId }}",
    "executionSecret": "={{ $('Process Input').first().json.executionSecret }}",
    "resultData": "={{ JSON.stringify($json.result) }}",
    "startTimeMs": "={{ $('Process Input').first().json._startTimeMs }}"
  },
  "name": "Codika Workflow Result",
  "type": "n8n-nodes-codika.codikaWorkflowResult",
  "typeVersion": 1
}
```

## Internal Implementation

This node internally:

1. Validates required parameters (executionId, executionSecret)
2. Parses resultData JSON if provided as string
3. Calculates executionTimeMs if startTimeMs was provided
4. Makes a POST request to `https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowResult`
5. Validates the response (`success === true`)
6. Returns confirmation on success
7. Throws error on failure (causes n8n to stop workflow)

## API Endpoint

**URL:** `POST https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowResult`

**Request Body:**

```json
{
  "executionId": "string",
  "executionSecret": "string",
  "result": { "...workflow output..." },
  "executionTimeMs": 1523
}
```
