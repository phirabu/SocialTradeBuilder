# System Architecture

```plaintext
+-------------------------------------------------------+
|                       Wizard UI                       |
| (Next.js React App in apps/wizard)                    |
| - Bot creation wizard (steps)                         |
| - Dashboard & Bot detail pages                        |
| - TradeForm & TradeList components                    |
+----------------------------+--------------------------+
                             |
                             | HTTP APIs (REST)
                             v
+----------------------------+--------------------------+
|                      Control API                     |
| (NestJS App in apps/control-api)                     |
| - BotController & TradeController                     |
| - BotsService executes SOL transfers & Jupiter swaps  |
| - PrismaService interacts with PostgreSQL DB         |
+----------------------------+--------------------------+
                             |
                             | ORM / SQL
                             v
                  +----------------------+
                  |   PostgreSQL (DB)    |
                  | (Supabase integration)|
                  | - Tables: Bot, Wallet, Trade |
                  +----------------------+
                             |
    +------------------------+------------------------+
    |                        |                        |
    v                        v                        v
+---------+    +---------------------------+    +-------------+
| Solana  |    |     Jupiter API           |    | Twitter API |
| Devnet  |    | (quote, swap endpoints)   |    |             |
+---------+    +---------------------------+    +-------------+
```

## Component Details
- **Wizard UI**: Built with Next.js app directory; uses React Server & Client components.
- **Control API**: NestJS with controllers, services, Prisma for data access.
- **Database**: PostgreSQL on Supabase, schema managed with Prisma migrations.
- **Blockchain & Swaps**:
  - Solana Web3.js for wallet management & SOL transfers.
  - Jupiter REST API for token swaps (quote & swap endpoints).
- **Security**:
  - AES encryption (CryptoJS) of bot secret keys in DB.
  - Environment variables for encryption keys and Devnet RPC settings.
