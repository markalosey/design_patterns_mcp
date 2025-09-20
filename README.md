# Design Patterns MCP Server 🎯

An intelligent MCP (Model Context Protocol) server that provides design pattern recommendations using semantic search and vector embeddings. This project offers access to a comprehensive catalog of 200+ design patterns through a natural language interface.

## 📋 Overview

The **Design Patterns MCP Server** is a specialized server that integrates with AI assistants (like Claude, Cursor) to provide intelligent design pattern recommendations. It uses advanced semantic search technologies to find the most appropriate patterns based on natural language problem descriptions.

### ✨ Key Features

- 🔍 **Intelligent Semantic Search**: Find patterns using natural problem descriptions
- 📚 **Comprehensive Catalog**: 200+ patterns organized in 20 categories
- 🎯 **Contextual Recommendations**: Suggestions based on programming language and domain
- ⚡ **Vector Search**: Uses SQLite with vector extensions for efficient search
- 🌐 **Multi-language**: Support for multiple programming languages
- 🔧 **MCP Integration**: Compatible with Claude Code, Cursor and other MCP clients

### 🗂️ Available Pattern Categories

- **GoF Patterns**: Classic patterns (Creational, Structural, Behavioral)
- **Architectural Patterns**: MVC, MVP, MVVM, Clean Architecture
- **Microservices Patterns**: Circuit Breaker, Event Sourcing, CQRS
- **Cloud Patterns**: Auto-scaling, Load Balancing, Service Discovery
- **AI/ML Patterns**: Model Training, Feature Engineering, Pipeline Patterns
- **Enterprise Patterns**: Repository, Unit of Work, Dependency Injection
- **Security Patterns**: Authentication, Authorization, Data Protection
- **Performance Patterns**: Caching, Lazy Loading, Connection Pooling
- **Concurrency Patterns**: Producer-Consumer, Thread Pool, Actor Model
- **Integration Patterns**: Message Queue, Event Bus, API Gateway
- **Data Access Patterns**: Active Record, Data Mapper, Query Object
- **Testing Patterns**: Test Double, Page Object, Builder Pattern for tests
- **Functional Patterns**: Monads, Functors, Higher-Order Functions
- **Reactive Patterns**: Observer, Publisher-Subscriber, Reactive Streams
- **DDD Patterns**: Aggregate, Value Object, Domain Service
- **Game Development Patterns**: State Machine, Component System, Object Pool
- **Mobile Patterns**: Model-View-Intent, Redux-like patterns
- **IoT Patterns**: Device Twin, Telemetry Ingestion
- **Anti-Patterns**: Practices to avoid and their solutions

## 🏗️ Project Architecture

```
src/
├── adapters/           # Adapters for external services
├── builders/           # Builders for complex objects
├── cli/               # Command line interface
├── core/              # Core domain logic
├── db/                # Database configuration and migrations
├── factories/         # Factories for object creation
├── lib/               # Auxiliary libraries and MCP utilities
├── models/            # Data models and types
├── repositories/      # Data access layer
├── services/          # Business services and orchestration
├── strategies/        # Specific strategy implementations
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── mcp-server.ts      # Main MCP server

data/
├── patterns/          # JSON files with pattern definitions
└── design-patterns.db # SQLite database with embeddings
```

### 🔧 Main Components

- **DatabaseManager**: Manages SQLite connections and operations
- **VectorOperationsService**: Vector search operations using sqlite-vec
- **SemanticSearchService**: Implements semantic search with embeddings
- **PatternMatcher**: Pattern matching and ranking logic
- **LLMBridgeService**: Interface for language models (optional)
- **EmbeddingServiceAdapter**: Adapter for embedding services

## 🚀 Installation and Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0 or Bun >= 1.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/design-patterns-mcp.git
cd design-patterns-mcp

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Build the project
npm run build

# Setup the database
npm run db:setup
```

### MCP Configuration

Add to your MCP configuration file (`.mcp.json`):

```json
{
  "mcpServers": {
    "design-patterns": {
      "command": "node",
      "args": ["dist/src/mcp-server.js"],
      "cwd": "/path/to/design-patterns-mcp"
    }
  }
}
```

## 📖 Usage

### Finding Patterns with Natural Language

Use natural language descriptions to find appropriate design patterns through Claude Code:

**For object creation problems:**
- "I need to create complex objects with many optional configurations"
- "How can I create different variations of similar objects?"
- "What pattern helps with step-by-step object construction?"

**For behavioral problems:**
- "I need to notify multiple components when data changes"
- "How to decouple command execution from the invoker?"
- "What pattern helps with state-dependent behavior?"

**For architectural problems:**
- "How to structure a microservices communication system?"
- "What pattern helps with distributed system resilience?"
- "How to implement clean separation between layers?"

### MCP Tool Functions

- **find_patterns**: Semantic search for patterns using problem descriptions
- **search_patterns**: Keyword or semantic search with filtering options  
- **get_pattern_details**: Get comprehensive information about specific patterns
- **count_patterns**: Statistics about available patterns by category

## 🛠️ Available Commands

### Development

```bash
npm run dev          # Run in development mode with hot reload
npm run dev:debug    # Run with debugging enabled
npm run build:watch  # Build in watch mode
```

### Testing

```bash
npm run test                # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests
npm run test:performance   # Run performance tests
```

### Code Quality

```bash
npm run lint           # Check linting issues
npm run lint:fix       # Fix linting issues automatically
npm run format         # Format code with Prettier
npm run typecheck      # Check TypeScript types
```

### Database

```bash
npm run migrate              # Run migrations
npm run seed                # Populate with initial data
npm run generate-embeddings # Generate embeddings for semantic search
npm run db:setup            # Complete database setup
npm run db:reset            # Reset and reconfigure database
```

## 🎯 Usage Examples

### Problem-Based Pattern Discovery

**Distributed Systems:**
- "I need a pattern for handling service failures gracefully"
- "How to implement eventual consistency in distributed data?"
- "What pattern helps with service discovery and load balancing?"

**Data Validation:**
- "I need to validate complex business rules on input data"
- "How to compose validation rules dynamically?"
- "What pattern separates validation logic from business logic?"

**Performance Optimization:**
- "I need to cache expensive computations efficiently"
- "How to implement lazy loading for large datasets?"
- "What pattern helps with connection pooling?"

### Category-Specific Searches

**Enterprise Applications:**
- "Show me enterprise patterns for data access"
- "What patterns help with dependency injection?"
- "How to implement unit of work pattern?"

**Security Implementation:**
- "I need authentication and authorization patterns"
- "What patterns help with secure data handling?"
- "How to implement role-based access control?"

## 🔧 Advanced Configuration

### Environment Variables

```env
# Database configuration
DATABASE_PATH=./data/design-patterns.db

# Logging configuration
LOG_LEVEL=info

# Embedding configuration
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Search configuration
SIMILARITY_THRESHOLD=0.7
MAX_RESULTS=10
```

### Search Customization

```javascript
const customConfig = {
  modelName: 'sentence-transformers/all-MiniLM-L6-v2',
  maxResults: 15,
  similarityThreshold: 0.75,
  contextWindow: 512,
  useQueryExpansion: true,
  useReRanking: true,
};
```

## 📊 Performance and Scalability

- **Vector Search**: Uses sqlite-vec for efficient search in large volumes
- **Intelligent Cache**: In-memory cache system for frequent queries
- **Optimized Indexes**: Specific indexes for different search types
- **Pagination**: Pagination support for large results
- **Metrics**: Performance and usage metrics collection

## 🧪 Testing

The project includes a comprehensive test suite:

- **Unit Tests**: Test individual components
- **Integration Tests**: Test interaction between components
- **Performance Tests**: Evaluate search and vectorization performance
- **Contract Tests**: Validate MCP protocol compliance

```bash
# Run specific tests
npm run test:unit -- --grep "PatternMatcher"
npm run test:integration -- --grep "database"
npm run test:performance -- --timeout 30000
```

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-functionality`)
3. Commit your changes (`git commit -am 'Add new functionality'`)
4. Push to the branch (`git push origin feature/new-functionality`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License.

## 🔗 Useful Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [SQLite Vector Extension](https://github.com/asg017/sqlite-vec)
- [Design Patterns Catalog](https://refactoring.guru/design-patterns)

## 📞 Support

- 🐛 **Issues**: Report bugs through [GitHub Issues](https://github.com/your-org/design-patterns-mcp/issues)
- 💬 **Discussions**: Join [GitHub Discussions](https://github.com/your-org/design-patterns-mcp/discussions)
- 📧 **Email**: apolosan@protonmail.com

---
