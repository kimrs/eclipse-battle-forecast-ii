# Build Prompt

Implement one task from the implementation plan.

study /spec/*.md

## Input

- TASKS.md

## Rules

- ONE task per iteration
- Mark task complete in the plan after implementing
- Follow @CLAUDE.md inner loop for verification

## Completion

When ALL tasks are complete:

- Output: <promise>COMPLETE</promise>

If blocked, note it in the plan and move to the next task.
