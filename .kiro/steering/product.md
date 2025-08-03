# Nintendo Switch API

A Cloudflare Workers-based API service that provides access to Nintendo Switch game data and user information. The API serves as a bridge between Nintendo's services and external applications, offering endpoints for:

- Nintendo account authentication via OAuth2
- User profile information retrieval
- Game library and play records access
- Game metadata with multilingual support (Chinese, English, Japanese)
- Database-backed game information storage

The service is designed to handle Nintendo's authentication flow, store game metadata in a D1 database, and provide clean REST API endpoints for accessing Nintendo Switch gaming data.
