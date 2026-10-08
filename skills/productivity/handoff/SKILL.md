---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Select the temporary root by platform: on Windows use `%TEMP%` (the `TEMP` environment variable, available as `$TEMP` in a shell); on Unix use `$TMPDIR` when non-empty, otherwise `/tmp`. Resolve the selected directory and final file to absolute paths, and verify the destination is outside the current workspace and repository. If no usable external temporary directory is available, ask the user for one rather than writing into the project. Name the file `pi-handoff-<UTC timestamp>-<unique suffix>.md`, using a filesystem-safe timestamp and an exclusive-create operation so an existing handoff is never overwritten; retry with a new suffix on collision.

Include a "suggested skills" section in the document, showing each suggested skill as a Pi command in the form `/skill:<name>` for the next user to invoke.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Before writing, redact sensitive information such as API keys, passwords, and personally identifiable information. Then report the final handoff file's absolute path.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
