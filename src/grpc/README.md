# EPI2ME API gRPC client

This sub-project is the *client* for the EPI2ME gRPC server. It supports 3 services.

---
## Sample Service

- Return a list of experiments available on the local device.

  `getSamples$ ( stream: false )`

---
## Status Service

- Return a status stream indicating if a connection to EPI2ME is available.

  `statusStream$ ( stream: true )`

---
## Workflow Service

- Start a new workflow, returning the start time and workflow instance ID.

  `start$ ( stream: false )`


- Stop uploading files for a given workflow.

  `stopUpload$ ( stream: false )`


- Stop the analysis for a given workflow.

  `stopAnalysis$ ( stream: false )`


- Return a stream indicating the status of a given workflow.

  `state$ ( stream: true )`


- Return a stream which contains a list of running workflows.

  `getRunning$ ( stream: true )`

