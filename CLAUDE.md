# HC Tracker Discord Bot

## Context

This is a Discord bot designed to manage family members' raid completion counts. The family requires members to complete raids every day, and players must submit an image daily to prove they are completing the raids. The bot tracks participation and maintains evidence of raid completions.

## Tech Stack

### Runtime & Language
- **TypeScript**: Type-safe development with strict mode enabled
- **Node.js**: ESNext target with modern JavaScript features

### Discord Integration
- **discord.js v14**: Discord bot framework and API wrapper
- **CommandKit**: A Meta-framework for Discord bot. Documentation: https://commandkit.dev/docs/guide/getting-started/introduction

### Database & Storage
- **PostgreSQL 16**: Primary database for persistent data storage
- **Redis 7**: Caching layer for improved performance

### Infrastructure
- **Docker**: Containerized deployment
- **Docker Compose**: Multi-container orchestration

### Development Tools
- **TypeScript 5**: Static type checking with bundler module resolution
- **ESNext**: Latest JavaScript features and syntax
- **Import Style**: Always use static imports at the top of the file
  - ✅ Correct: `import { getDiscordLocale } from "@/utils/language";`
  - ❌ Wrong: `const { getDiscordLocale } = await import("@/utils/language");`
  - Avoid dynamic imports unless absolutely necessary for code splitting

### Internationalization (i18n)
- **Locale Structure**: Use separate JSON files per namespace
  - **Commands**: Use command name as namespace (e.g., `/createraid` → `createraid.json`)
  - **Non-commands**: Use descriptive namespace names
  - Location: `/src/app/locales/{locale}/{namespace}.json`
  - Example: `/src/app/locales/en-US/createraid.json`
- **Variable Interpolation**: Use double curly braces `{{variable}}` not single braces
  - ✅ Correct: `"message": "Hello {{name}}"`
  - ❌ Wrong: `"message": "Hello {name}"`
- **Quotation Marks**:
  - **All locales** (including Chinese): Use `""` for quotes
  - ✅ Correct (Chinese): `"已建立\"{{name}}\"活動"`
  - ❌ Wrong (Chinese): `"已建立「{{name}}」活動"`
- **Supported Locales**:
  - `en-US` - English
  - `zh-TW` - Traditional Chinese (Taiwan)
- **Timezone Handling**:
  - Chinese locale (zh-TW): Asia/Taipei (UTC+8)
  - Other locales: Uses `TZ` environment variable

## Features

### Raid Tracking System
- **Record Player Complete Count**: Track the total number of raids completed by each player
- **Complete Day Tracking**: Monitor which days each player has completed raids
- **Image Evidence Storage**: Save submitted images as proof of raid completion for each day
- **Daily Submission Management**: Handle daily image submissions from players to verify raid completion
- **Raid Event Creation**: Create Discord scheduled events through `/createraid` command
  - Modal-based event creation with date, time, location, and description
  - Timezone-aware input (Asia/Taipei for Chinese, TZ environment variable for other locales)
  - Automatic notifications to RaidEvent channels
  - Database tracking of all created events with Discord event integration
  - Available to all guild members (no admin restriction)

### Data Management
- Persistent storage of player statistics and completion history
- Image evidence retention for verification and auditing purposes
- Redis caching for fast data retrieval and improved bot responsiveness

### Infrastructure
- Separate development and production Docker environments
- Health checks for database and cache services
- Automatic restart on failure
- Volume persistence for database and cache data
