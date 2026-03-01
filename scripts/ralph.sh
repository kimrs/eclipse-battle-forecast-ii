#!/usr/bin/env bash
# Ralph Wiggum Loop
# Runs `claude` repeatedly, one task at a time, until all tasks in TASKS.md are ✅.
#
# Usage: bash scripts/ralph.sh
#
# "I'm helping!" — Ralph Wiggum

set -euo pipefail

TASKS_FILE="TASKS.md"
MAX_ITERATIONS=25  # safety valve — don't loop forever

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "❌ $TASKS_FILE not found. Run from the project root."
  exit 1
fi

iteration=0

while true; do
  iteration=$((iteration + 1))

  # Count remaining tasks (unchecked boxes)
  remaining=$(grep -c '^\- \[ \]' "$TASKS_FILE" || true)

  if [[ "$remaining" -eq 0 ]]; then
    echo ""
    echo "🎉 All tasks complete! Ralph is done helping."
    echo "   Total iterations: $iteration"
    exit 0
  fi

  if [[ "$iteration" -gt "$MAX_ITERATIONS" ]]; then
    echo ""
    echo "⚠️  Hit max iterations ($MAX_ITERATIONS). $remaining tasks remaining."
    echo "   Check TASKS.md for stuck tasks."
    exit 1
  fi

  # Get the next uncompleted task line
  next_task=$(grep -m1 '^\- \[ \]' "$TASKS_FILE" | sed 's/^- \[ \] \*\*//' | sed 's/\*\*.*//')

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Iteration $iteration/$MAX_ITERATIONS — $remaining tasks remaining"
  echo "🔨 Next: $next_task"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run claude with the task instruction
  cat <<PROMPT | claude --verbose --model opus --dangerously-skip-permissions --print
Read TASKS.md and find the first uncompleted task (marked with "- [ ]").
Complete that task following its description and the referenced spec files.
After completing the task, edit TASKS.md to mark it done by replacing its "- [ ]" with "- [x] ✅".
Do NOT work on any other tasks — just the first uncompleted one.
If the task includes tests, make sure they pass before marking it done.
PROMPT

  echo ""
  echo "✅ Iteration $iteration complete."

done
