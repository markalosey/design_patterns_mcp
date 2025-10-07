# Git Workflow Command

## Usage

/git-workflow

## Purpose

Execute complete git workflow for file changes in the Design Patterns MCP project

## Behavior

1. `pwd` (verify location)
2. `git status` (check state)
3. `git add .` (stage changes)
4. `git commit -m "descriptive message"` (commit)
5. `git push origin main` (push)

## When to Use

- After creating new files
- After modifying existing files
- Before ending a session
- When user requests file changes
- After implementing new patterns or services
- After updating tests or documentation

## MCP-Specific Considerations

When using this command in the Design Patterns MCP project:

- Ensure database files are properly handled
- Check that pattern files maintain proper structure
- Verify that TypeScript compilation is successful
- Confirm that tests pass before committing
- Use descriptive commit messages that reference the specific pattern or feature

## Example Commit Messages

- "Add new Factory Method pattern implementation"
- "Update pattern analyzer service with improved matching"
- "Fix vector operations performance issue"
- "Add integration tests for MCP protocol"
- "Refactor embedding service adapter"
