# Technology Stack

## Runtime & Platform
- **Cloudflare Workers**: Serverless runtime environment
- **TypeScript**: Primary language with strict type checking enabled
- **Node.js**: Development environment

## Database
- **Cloudflare D1**: SQLite-based database for game metadata storage
- **Database binding**: `DB` environment variable

## Build System & Tools
- **Wrangler**: Cloudflare Workers CLI for development and deployment
- **Vitest**: Testing framework with Cloudflare Workers pool
- **TypeScript Compiler**: ES2021 target with bundler module resolution

## Code Quality
- **Prettier**: Code formatting with tabs, 140 character line width, single quotes
- **EditorConfig**: Consistent editor settings across team

## Common Commands

### Development
```bash
# Start local development server
pnpm dev
# or
pnpm start

# Deploy to Cloudflare
pnpm deploy

# Run tests
pnpm test

# Generate TypeScript types for Cloudflare bindings
pnpm cf-typegen
```

### Key Dependencies
- `@cloudflare/vitest-pool-workers`: Testing in Workers environment
- `wrangler`: Cloudflare Workers development toolkit
- `vitest`: Fast unit testing framework
- `typescript`: Type checking and compilation

## Configuration Files
- `wrangler.jsonc`: Cloudflare Workers configuration
- `tsconfig.json`: TypeScript compiler options
- `vitest.config.mts`: Test configuration
- `.prettierrc`: Code formatting rules
- `.editorconfig`: Editor consistency settings