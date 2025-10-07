# Context7 Library Search Command

## Usage

/context7-search

## Purpose

Search for libraries using Context7 MCP server with proper workflow

## Behavior

1. Use `mcp_context7_resolve-library-id` to find matching libraries
2. Analyze results based on name match, trust score, and code snippets
3. Select the most relevant library ID
4. Use `mcp_context7_get-library-docs` to retrieve documentation
5. Provide structured analysis of the library and its usage

## When to Use

- User requests information about a specific library or framework
- Need to find documentation for a particular technology
- Looking for code examples and best practices
- Researching library alternatives or comparisons

## Context7-Specific Considerations

### Library Selection Criteria
- **Name Match**: Prioritize exact or close name matches
- **Trust Score**: Prefer libraries with scores 7-10 for authority
- **Code Snippets**: Higher snippet counts indicate better documentation
- **Versions**: Use specific versions when provided by user

### Documentation Retrieval
- Use appropriate token limits (default 5000, adjust based on need)
- Specify relevant topics to focus documentation
- Consider multiple library versions if available

### Error Handling
- Handle cases where no libraries are found
- Provide alternative suggestions when exact matches fail
- Explain selection rationale to user

## Example Scenarios

- "How do I use React hooks?"
- "Find documentation for Express.js"
- "What are the best practices for Vue.js components?"
- "Compare different state management libraries"
- "Show me examples of TypeScript with Next.js"

## Workflow Example

1. User: "I need help with React Router"
2. Search: `mcp_context7_resolve-library-id` with "react router"
3. Select: Choose `/remix-run/react-router` (high trust score, good snippets)
4. Retrieve: `mcp_context7_get-library-docs` with topic "routing"
5. Present: Structured documentation with code examples
