# Design Patterns MCP HTTP Server Setup

## 🚀 **Much Better Architecture!**

Instead of spawning processes with absolute paths, we now have a proper HTTP server that runs persistently and can be accessed via URL.

## 🔧 **How to Start the HTTP Server**

### Option 1: Development Mode
```bash
npm run dev:http
```

### Option 2: Production Mode
```bash
npm run build
npm run start:http
```

### Option 3: Global Installation
```bash
npm install -g .
design-patterns-http
```

## 🌐 **Server Endpoints**

Once running, the server provides:

- **HTTP Server**: `http://localhost:3001`
- **MCP Endpoint**: `http://localhost:3001/mcp` (SSE transport)
- **REST API**: `http://localhost:3001/api`
- **Health Check**: `http://localhost:3001/health`

### REST API Endpoints:
- `GET /api/tools` - List available tools
- `POST /api/count-patterns` - Count patterns
- `POST /api/find-patterns` - Find patterns by description
- `POST /api/search-patterns` - Search patterns by keyword
- `POST /api/get-pattern-details` - Get pattern details

## 🔧 **Cursor Configuration**

### Method 1: HTTP URL (Recommended)
```json
{
  "design-patterns": {
    "url": "http://localhost:3001/mcp"
  }
}
```

### Method 2: Process with HTTP Server
```json
{
  "design-patterns": {
    "command": "node",
    "args": ["dist/src/http-server.js"],
    "env": {
      "PORT": "3001",
      "HOST": "localhost",
      "DATABASE_PATH": "./data/design-patterns.db"
    }
  }
}
```

## 🎯 **Advantages of HTTP Server**

### ✅ **Much Better Than Process Spawning:**
- **No absolute paths** - uses URLs instead
- **Persistent server** - stays running
- **Multiple clients** - can handle multiple connections
- **REST API access** - can be used from web browsers
- **Health monitoring** - `/health` endpoint
- **Scalable** - can be deployed anywhere
- **Maintainable** - standard HTTP server

### ✅ **Both MCP and REST Access:**
- **MCP Protocol**: `http://localhost:3001/mcp` (for Cursor)
- **REST API**: `http://localhost:3001/api/*` (for web access)
- **Health Check**: `http://localhost:3001/health`

## 🚀 **Quick Start**

1. **Start the server:**
   ```bash
   npm run start:http
   ```

2. **Update Cursor config:**
   ```json
   {
     "design-patterns": {
       "url": "http://localhost:3001/mcp"
     }
   }
   ```

3. **Test the server:**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/api/tools
   ```

## 🔧 **Environment Variables**

- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: localhost)
- `DATABASE_PATH` - Database file path
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `ENABLE_LLM` - Enable LLM features (true/false)
- `MAX_CONCURRENT_REQUESTS` - Max concurrent requests (default: 10)

## 📊 **Server Status**

The server provides a health endpoint at `/health` that shows:
- Server status
- Database path and pattern count
- Configuration details
- Timestamp

## 🎉 **No More Absolute Paths!**

This HTTP server approach is:
- ✅ **Professional** - standard HTTP server architecture
- ✅ **Portable** - works from any directory
- ✅ **Scalable** - can handle multiple clients
- ✅ **Maintainable** - standard web server patterns
- ✅ **Accessible** - both MCP and REST API access

---

**This is how MCP servers should work!** 🎯
