# Context7 Documentation Retrieval Command

## Usage

/context7-docs

## Purpose

Retrieve comprehensive documentation from Context7 MCP server

## Behavior

1. Identify the specific library or technology needed
2. Use `mcp_context7_resolve-library-id` to find the library
3. Use `mcp_context7_get-library-docs` with appropriate parameters
4. Structure and present the documentation clearly
5. Include relevant code examples and best practices

## When to Use

- User needs detailed documentation for a library
- Looking for specific implementation examples
- Need to understand API usage patterns
- Researching advanced features or techniques

## Parameters

### Library ID Resolution
- Use exact library names when possible
- Consider alternative names and common variations
- Check for version-specific requests

### Documentation Retrieval
- **tokens**: Adjust based on complexity (1000-10000)
- **topic**: Focus on specific areas (e.g., "hooks", "routing", "authentication")
- **context7CompatibleLibraryID**: Use exact format from resolve results

## Best Practices

### Token Management
- Start with 5000 tokens for general documentation
- Use 1000-2000 tokens for specific topics
- Use 8000-10000 tokens for comprehensive coverage

### Topic Selection
- Use specific topics to focus results
- Common topics: "hooks", "components", "routing", "state", "performance"
- Leave topic empty for general documentation

### Library Selection
- Prefer official documentation sources
- Consider trust scores and snippet counts
- Use version-specific IDs when available

## Example Workflows

### Basic Documentation
1. User: "Show me React documentation"
2. Resolve: Search for "react"
3. Select: `/websites/react_dev` (official, high trust)
4. Retrieve: Get general documentation with 5000 tokens

### Topic-Specific Documentation
1. User: "How do React hooks work?"
2. Resolve: Search for "react"
3. Select: `/websites/react_dev`
4. Retrieve: Get documentation with topic "hooks" and 2000 tokens

### Version-Specific Documentation
1. User: "React Router v7 documentation"
2. Resolve: Search for "react router"
3. Select: `/remix-run/react-router` with version
4. Retrieve: Get version-specific documentation

## Error Handling

- **No matches found**: Suggest alternative search terms
- **Multiple matches**: Explain selection criteria and let user choose
- **Empty results**: Try broader topics or different libraries
- **API errors**: Provide fallback suggestions and retry options
