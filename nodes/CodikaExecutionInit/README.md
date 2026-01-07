# Codika Execution Init Node

## Purpose

This node registers workflow executions with Codika's tracking system. It is **required** for all workflows that use non-HTTP triggers (schedule, service_event).

## Why This Node Exists

### The Problem

Codika has two types of workflow triggers:

1. **HTTP triggers** (webhooks): Initiated by Codika's backend via `triggerWebhook` Cloud Function
   - Execution tracking is handled automatically by the backend
   - The backend creates an execution document before calling the webhook

2. **Non-HTTP triggers** (schedule, service_event): Initiated directly by n8n
   - Examples: Gmail, Calendly, Slack, Telegram, cron schedules
   - n8n starts the workflow directly, bypassing Codika's backend
   - No execution document is created
   - Codika has no visibility into these executions

### The Solution

This node calls the `createWorkflowExecution` Cloud Function at the start of the workflow to:

1. Register the execution with Codika's tracking system
2. Get an `executionId` and `executionSecret` for later callbacks
3. Get callback URLs for submitting results/errors

### What This Node Replaced

Previously, this required **4 separate nodes**:

1. **Initialize Execution** (HTTP Request) - Called the Cloud Function
2. **Init Success?** (IF node) - Checked if initialization succeeded
3. **Store Execution Data** (Code node) - Merged execution metadata with trigger data
4. **Abort on Init Failure** (Code node) - Stopped workflow on failure

This node consolidates all that logic into a single step.

## Parameters

| Parameter | Placeholder | Description |
|-----------|-------------|-------------|
| `memberSecret` | `{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}` | Authentication secret for the member |
| `organizationId` | `{{USERDATA_ORGANIZATION_ID_ATADRESU}}` | Organization ID for zero-DB-read auth |
| `userId` | `{{USERDATA_USER_ID_ATADRESU}}` | User ID for zero-DB-read auth |
| `processInstanceId` | `{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}` | Process instance ID |
| `workflowId` | Your workflow ID (e.g., `calendly-to-folk`) | Must match config.ts |
| `triggerType` | Service name (e.g., `calendly`, `gmail`, `schedule`) | For logging |

## Output

On success, the node outputs:

```json
{
  "executionId": "01234567-89ab-cdef-0123-456789abcdef",
  "executionSecret": "abcdef12-3456-7890-abcd-ef1234567890",
  "callbackUrl": "https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowResult",
  "errorCallbackUrl": "https://europe-west1-codika-app.cloudfunctions.net/submitWorkflowError",
  "processId": "...",
  "userId": "...",
  "_startTimeMs": 1234567890123
}
```

## Error Handling

- **On success**: Returns execution metadata, workflow continues to next node
- **On failure**: Throws a `NodeOperationError`, n8n aborts the workflow automatically

No need for separate IF/abort nodes - error handling is built-in.

## Usage

### Workflow Structure

```
Trigger (Gmail/Calendly/Schedule)
        ↓
Codika Execution Init  ←── This node
        ↓
Main Business Logic
        ↓
    ┌───┴───┐
    ↓       ↓
Success   Error
    ↓       ↓
Submit   Submit
Result   Error
```

### Node JSON Example

```json
{
  "parameters": {
    "memberSecret": "{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}",
    "organizationId": "{{USERDATA_ORGANIZATION_ID_ATADRESU}}",
    "userId": "{{USERDATA_USER_ID_ATADRESU}}",
    "processInstanceId": "{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}",
    "workflowId": "calendly-to-folk",
    "triggerType": "calendly"
  },
  "name": "Codika Execution Init",
  "type": "n8n-nodes-codika.codikaExecutionInit",
  "typeVersion": 1,
  "position": [460, 300]
}
```

### Referencing Output in Other Nodes

In downstream nodes, reference the execution data using:

```javascript
$('Codika Execution Init').first().json.executionId
$('Codika Execution Init').first().json.callbackUrl
$('Codika Execution Init').first().json._startTimeMs
```

## Internal Implementation

This node internally:

1. Collects all input data from the trigger node
2. Makes a POST request to `https://europe-west1-codika-app.cloudfunctions.net/createWorkflowExecution`
3. Validates the response (`success === true`)
4. Returns execution metadata on success
5. Throws error on failure (causes n8n to abort)

## When NOT to Use This Node

- **HTTP trigger workflows**: Tracking is handled by `triggerWebhook` Cloud Function
- **Sub-workflows**: Parent workflow handles tracking
