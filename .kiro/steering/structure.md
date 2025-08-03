# Project Structure

## Root Directory
- `src/`: Main application source code
- `schema/`: Database schema definitions
- `test/`: Test files and configurations
- `.kiro/`: Kiro AI assistant configuration
- `.wrangler/`: Wrangler build artifacts and state

## Source Code Organization (`src/`)

### Entry Point
- `index.ts`: Main Worker entry point with request routing and CORS handling

### Core Architecture
- `types.ts`: TypeScript type definitions for the entire application
- `handlers/`: Request handlers organized by feature
  - `auth.ts`: Nintendo OAuth2 authentication flow
  - `user.ts`: User profile information handling
  - `games.ts`: Game records and metadata handling
- `services/`: Business logic and external API integration
  - `database-service.ts`: D1 database operations
  - `nintendo-service.ts`: Nintendo API integration
- `utils/`: Shared utility functions
  - `session-manager.ts`: Session state management
  - `url-parser.ts`: URL parsing utilities

## Database Schema (`schema/`)
- `init.sql`: Database initialization with tables for games, scraping stats, and indexes

## Testing (`test/`)
- `index.spec.ts`: Main test suite
- `env.d.ts`: Test environment type definitions
- `tsconfig.json`: Test-specific TypeScript configuration

## API Endpoints Structure
```
GET  /health           - Health check with database stats
POST /api/auth/url     - Generate Nintendo OAuth URL
POST /api/auth/callback - Handle OAuth callback
POST /api/user         - Get user profile information
POST /api/games        - Get user's game records
GET  /api/stats        - Get database statistics
```

## Architectural Patterns
- **Handler-Service Pattern**: Handlers manage HTTP concerns, services contain business logic
- **Type-First Development**: Comprehensive TypeScript types defined in `types.ts`
- **Error Handling**: Custom error classes (`NintendoAPIError`, `SessionError`)
- **CORS Support**: Built-in CORS handling for all endpoints
- **Performance Monitoring**: Response time tracking via headers

## File Naming Conventions
- Use kebab-case for file names: `database-service.ts`
- Use PascalCase for class names: `DatabaseService`
- Use camelCase for functions and variables
- Use SCREAMING_SNAKE_CASE for constants
