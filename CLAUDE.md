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

## Features

### Raid Tracking System
- **Record Player Complete Count**: Track the total number of raids completed by each player
- **Complete Day Tracking**: Monitor which days each player has completed raids
- **Image Evidence Storage**: Save submitted images as proof of raid completion for each day
- **Daily Submission Management**: Handle daily image submissions from players to verify raid completion

### Data Management
- Persistent storage of player statistics and completion history
- Image evidence retention for verification and auditing purposes
- Redis caching for fast data retrieval and improved bot responsiveness

### Infrastructure
- Separate development and production Docker environments
- Health checks for database and cache services
- Automatic restart on failure
- Volume persistence for database and cache data
