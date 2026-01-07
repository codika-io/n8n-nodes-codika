# n8n-nodes-codika

This is an n8n community node package for integrating with the **Codika** platform. It enables n8n workflows to report execution status, results, and errors back to Codika for tracking and monitoring.

[Codika](https://codika.io) is a workflow automation platform that orchestrates and monitors workflow executions across different triggers and services.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Table of Contents

- [Installation](#installation)
- [Nodes](#nodes)
  - [Codika Init](#codika-init)
  - [Codika Event](#codika-event)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)
- [Version History](#version-history)
- [License](#license)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Install

1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Select **Install**
3. Enter `n8n-nodes-codika` and click **Install**

## Nodes

### Codika Init

The **Codika Init** node initializes a workflow execution and establishes the connection with the Codika platform.

**Trigger Modes:**

| Mode | Description |
|------|-------------|
| **Passthrough** | For HTTP/Webhook triggers - extracts execution metadata directly from the incoming payload |
| **Create** | For scheduled/service triggers - creates a new execution via the Codika API |

**Parameters (Create Mode):**

| Parameter | Description |
|-----------|-------------|
| Member Secret | Your Codika member authentication secret |
| Organization ID | Your Codika organization identifier |
| User ID | The user identifier for the execution |
| Process Instance ID | The process instance to associate with this execution |
| Workflow ID | The workflow template identifier |
| Trigger Type | Type of trigger (e.g., "schedule", "gmail", "webhook") |

**Output:**

The node outputs execution metadata including:
- `executionId` - Unique identifier for this execution
- `executionSecret` - Secret token for authenticating callbacks
- `callbackUrl` - URL for submitting results
- `errorCallbackUrl` - URL for reporting errors

### Codika Event

The **Codika Event** node reports workflow execution outcomes back to Codika.

**Operations:**

| Operation | Description |
|-----------|-------------|
| **Submit Result** | Report successful workflow completion with output data |
| **Report Error** | Report workflow failures with error details |

**Submit Result Parameters:**

| Parameter | Description |
|-----------|-------------|
| Result | JSON object containing the workflow output |
| Execution Time (ms) | Optional execution duration in milliseconds |

**Report Error Parameters:**

| Parameter | Description |
|-----------|-------------|
| Error Message | Description of what went wrong |
| Error Type | Category: `node_failure`, `validation_error`, `external_api_error`, or `timeout` |
| Failed Node Name | Optional name of the node that failed |
| Last Executed Node | Optional name of the last successfully executed node |

**Auto-Detection:**

The Codika Event node automatically detects execution parameters from the Codika Init node in your workflow, so you don't need to manually configure the execution ID and secret.

## Usage

### Basic Workflow Pattern

```
[Trigger] → [Codika Init] → [Your Logic] → [Codika Event: Submit Result]
                                      ↓
                              [Error Handler] → [Codika Event: Report Error]
```

### Example: HTTP Trigger Workflow

1. Add a **Webhook** trigger node
2. Add **Codika Init** node (auto-detects HTTP payload)
3. Add your business logic nodes
4. Add **Codika Event** → **Submit Result** for success path
5. Add **Codika Event** → **Report Error** in error handling branch

### Example: Scheduled Workflow

1. Add a **Schedule** trigger node
2. Add **Codika Init** node with your Codika credentials
3. Add your business logic nodes
4. Add **Codika Event** → **Submit Result** for success path
5. Add **Codika Event** → **Report Error** in error handling branch

## Compatibility

- **Minimum n8n version:** 1.0.0
- **Tested with:** n8n 1.x

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Codika Platform](https://codika.io)
- [GitHub Repository](https://github.com/codika-io/n8n-nodes-codika)

## Version History

### 0.1.0

- Initial release
- Codika Init node with passthrough and create modes
- Codika Event node with submit result and report error operations

## License

[MIT](LICENSE)
