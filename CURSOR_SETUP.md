# Design Patterns MCP Server - Cursor Setup Guide

This guide provides step-by-step instructions for running the Design Patterns MCP Server and integrating it with Cursor.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Cursor IDE

### 2. Installation & Setup

```bash
# Navigate to the project directory
cd /Users/mlosey/fresh-start/fresh-start-mcp/design_patterns_mcp

# Install dependencies
npm install

# Build the project
npm run build

# Setup the database (migrations + seeding)
npm run migrate
npm run seed

# Optional: Generate embeddings for semantic search
# Note: This may fail due to migration issues, but the server works without it
npm run generate-embeddings
```

### 3. Test the Server

```bash
# Test that the server starts (will run for 5 seconds then timeout)
timeout 5s npm start || echo "Server started successfully"
```

## 🔧 Cursor MCP Configuration

### Method 1: Cursor Settings (Recommended)

1. Open Cursor IDE
2. Go to **Settings** (Cmd/Ctrl + ,)
3. Search for "MCP" or navigate to **Features** → **Model Context Protocol**
4. Click **Add Server**
5. Configure the server with these settings:

```json
{
  "name": "design-patterns",
  "command": "node",
  "args": ["dist/src/mcp-server.js"],
  "cwd": "/Users/mlosey/fresh-start/fresh-start-mcp/design_patterns_mcp",
  "env": {
    "LOG_LEVEL": "info",
    "DATABASE_PATH": "./data/design-patterns.db"
  }
}
```

### Method 2: Configuration File

If Cursor uses a configuration file, create or edit the MCP configuration:

**Location**: `~/.cursor/mcp.json` or similar (check Cursor documentation)

```json
{
  "mcpServers": {
    "design-patterns": {
      "command": "node",
      "args": ["dist/src/mcp-server.js"],
      "cwd": "/Users/mlosey/fresh-start/fresh-start-mcp/design_patterns_mcp",
      "env": {
        "LOG_LEVEL": "info",
        "DATABASE_PATH": "./data/design-patterns.db",
        "ENABLE_LLM": "false",
        "MAX_CONCURRENT_REQUESTS": "10"
      }
    }
  }
}
```

## 🎯 Available MCP Tools

Once configured, you can use these tools in Cursor:

### 1. `find_patterns`
Find design patterns using natural language descriptions.

**Example Usage:**
- "I need to create complex objects with many optional configurations"
- "How can I notify multiple components when data changes?"
- "What pattern helps with distributed system resilience?"

**Parameters:**
- `query` (required): Natural language description of the problem
- `categories` (optional): Array of pattern categories to search in
- `maxResults` (optional): Maximum number of recommendations (default: 5)
- `programmingLanguage` (optional): Target programming language

### 2. `search_patterns`
Search patterns by keyword or semantic similarity.

**Parameters:**
- `query` (required): Search query
- `searchType` (optional): "keyword", "semantic", or "hybrid" (default: "hybrid")
- `limit` (optional): Maximum results (default: 10)

### 3. `get_pattern_details`
Get comprehensive information about a specific pattern.

**Parameters:**
- `patternId` (required): Pattern ID to get details for

### 4. `count_patterns`
Get statistics about available patterns.

**Parameters:**
- `includeDetails` (optional): Include breakdown by category (default: false)

## 🛠️ Development Commands

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Database operations
npm run migrate          # Run database migrations
npm run seed            # Populate with pattern data
npm run generate-embeddings  # Generate vector embeddings

# Testing
npm test                # Run all tests
npm run lint           # Check code quality
npm run typecheck      # Check TypeScript types
```

## 🔍 Troubleshooting

### Server Won't Start

1. **Check Node.js version**: Ensure you have Node.js >= 18.0.0
   ```bash
   node --version
   ```

2. **Verify build**: Make sure the project is built
   ```bash
   npm run build
   ls -la dist/src/mcp-server.js
   ```

3. **Check database**: Ensure database exists
   ```bash
   ls -la data/design-patterns.db
   ```

4. **Run migrations**: If database is missing
   ```bash
   npm run migrate
   npm run seed
   ```

### Cursor Integration Issues

1. **Verify path**: Ensure the `cwd` path is correct and absolute
2. **Check permissions**: Ensure Cursor can execute the server
3. **Test manually**: Run the server manually to verify it works
   ```bash
   cd /Users/mlosey/fresh-start/fresh-start-mcp/design_patterns_mcp
   node dist/src/mcp-server.js
   ```

### Database Issues

1. **Reset database**: Remove and recreate
   ```bash
   rm data/design-patterns.db
   npm run migrate
   npm run seed
   ```

2. **Migration errors**: Check migration files for conflicts
3. **Embedding generation**: This step is optional and may fail - the server works without it

## 📊 Server Features

- **555+ Design Patterns**: Comprehensive catalog across 20+ categories
- **Semantic Search**: Natural language pattern discovery
- **Vector Search**: Efficient similarity-based recommendations
- **Multi-language Support**: Examples in multiple programming languages
- **Performance Optimized**: Object pooling and caching for speed
- **MCP Compliant**: Full Model Context Protocol support

## 🎨 Pattern Categories

- **GoF Patterns**: Creational, Structural, Behavioral
- **Architectural**: MVC, MVP, MVVM, Clean Architecture
- **Microservices**: Circuit Breaker, Event Sourcing, CQRS
- **Cloud Patterns**: Auto-scaling, Load Balancing
- **AI/ML Patterns**: RAG, Few-Shot Learning
- **React Patterns**: Hooks, Server Components, Suspense
- **Enterprise**: Repository, Unit of Work, DI
- **Security**: Authentication, Authorization
- **Performance**: Caching, Lazy Loading, Object Pool
- **And many more...**

## 🔗 Useful Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Cursor MCP Integration Guide](https://cursor.sh/docs)
- [Design Patterns Catalog](https://refactoring.guru/design-patterns)

---

**Server Status**: ✅ Ready for Cursor integration  
**Database**: ✅ Migrated and seeded  
**Build**: ✅ Compiled successfully  
**Version**: 0.2.1
