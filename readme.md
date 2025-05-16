# Tweet-to-Trade Bot Builder

## 1. Overview

The Tweet-to-Trade Bot Builder is a full-stack web application that enables users to create and manage trading bots that execute Solana blockchain transactions in response to Twitter commands. The application follows a client-server architecture with a React frontend, Express backend, and PostgreSQL database.

The core functionality allows users to:
- Create custom trading bots with specific Twitter accounts
- Configure Solana wallets for transaction execution
- Define supported trading commands and tokens
- Monitor bot activity and transaction history
- Deploy bots that listen to Twitter commands and execute trades

## 2. System Architecture

The application follows a modern three-tier architecture:

### 2.1 Frontend (Client)
- Single-page application built with React
- Uses Vite as the build tool and development server
- Implements the shadcn/ui component library with Tailwind CSS for styling
- State management using React Query for server state and Zustand for client state

### 2.2 Backend (Server)
- Express.js server handling API requests and serving the static frontend
- RESTful API structure for bot management and transactions
- Integration with Twitter API for webhook-based event handling (to be implemented)
- Integration with Solana blockchain for wallet management and transaction execution

### 2.3 Database
- PostgreSQL database using Drizzle ORM for data access
- Database schema focuses on bots, wallets, trades, and Twitter webhooks

## 3. Key Components

### 3.1 Frontend Components

#### 3.1.1 Pages
- **Home**: Landing page with application overview
- **Wizard**: Multi-step form for creating new bots
- **Dashboard**: Management interface for existing bots
- **Tweet-Debug**: Test the whole End 2 End Flow

#### 3.1.2 State Management
- **QueryClient**: React Query for API data fetching and caching
- **WizardStore**: Zustand store for managing the bot creation flow
- **BotStore**: Zustand store for local bot state management

#### 3.1.3 UI Components
- Shadcn/ui component library for consistent design
- Custom components built on top of Radix UI primitives
- Responsive design with mobile-first approach

### 3.2 Backend Services

#### 3.2.1 API Routes
- RESTful endpoints for bot CRUD operations
- Authentication and user management
- Webhook handling for Twitter integrations

#### 3.2.2 Solana Integration
- Wallet creation and management
- Transaction signing and broadcasting
- Balance checking and token swaps

#### 3.2.3 Parser Service
- Command parsing for Twitter interactions
- Validation of trade commands

#### 3.2.4 Jupiter Integration
- Token swap functionality through Jupiter API
- Price quotes and execution

### 3.3 Database Schema

The database schema consists of several key tables:

- **users**: User authentication and profile information
- **bots**: Configuration for trading bots
- **wallets**: Solana wallet information (encrypted private keys)
- **trades**: Record of executed transactions
- **botConfigs**: Detailed configuration for each bot
- **twitterWebhooks**: Twitter integration configuration

## 4. Data Flow

### 4.1 Bot Creation Flow
1. User creates a new bot through the wizard interface
2. Frontend collects bot details, wallet configuration, and command settings
3. Backend creates necessary database records and initializes the Solana wallet
4. Twitter webhook is registered to listen for mentions of the bot
5. Bot is deployed and ready to respond to commands

### 4.2 Trade Execution Flow
1. User tweets a command mentioning the bot (e.g., "@TradeBot buy 0.1 SOL of USDC")
2. Twitter webhook notifies the application backend
3. Command parser extracts the trade details (action, tokens, amount)
4. System validates the command and checks wallet balance
5. If valid, a Solana transaction is constructed (using Jupiter for swaps)
6. Transaction is signed with the bot's private key and broadcast to the network
7. Transaction result is stored in the database and a reply is sent on Twitter

## 5. External Dependencies

### 5.1 Blockchain
- **Solana Web3.js**: Interaction with Solana blockchain
- **Jupiter API**: DEX aggregator for token swaps

### 5.2 Frontend
- **React**: UI framework
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI primitives
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **Wouter**: Routing

### 5.3 Backend
- **Express**: Web server framework
- **Drizzle ORM**: Database ORM
- **Zod**: Schema validation
- **CryptoJS**: Encryption for private keys

### 5.4 Database
- **PostgreSQL**: Relational database
- **Neon Database**: Serverless Postgres provider

## 6. Deployment Strategy

The application is configured for deployment on Replit, with automatic scaling handled by Replit's infrastructure.

### 6.1 Build Process
- Frontend is built using Vite
- Backend is bundled using esbuild
- Combined into a single deployable package

### 6.2 Environment Configuration
- Development mode uses a local dev server with HMR
- Production mode serves static assets from the built frontend
- Environment variables control database connections and API keys

### 6.3 Database Deployment
- Uses Neon Database's serverless PostgreSQL
- Database URL is provided via environment variables
- Schema migrations managed through Drizzle Kit

### 6.4 Scaling Considerations
- Stateless server design allows for horizontal scaling
- Database connections are managed efficiently for serverless environment
- Frontend is static and can be cached at the edge

## 7. Security Considerations (to be implemented before official release)

### 7.1 Private Key Management
- Private keys for Solana wallets are encrypted before storage (to be implemented)
- Encryption keys are stored in environment variables (to be implemented)
- No private keys are exposed to the frontend

### 7.2 API Security
- Input validation using Zod schemas (to be implemented)
- Rate limiting on sensitive endpoints 
- Error handling that doesn't leak implementation details (to be implemented)

### 7.3 Authentication
- Session-based authentication for admin users (to be implemented)
- CSRF protection for state-changing operations (to be implemented)