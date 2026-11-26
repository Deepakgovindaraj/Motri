# Vehixa — Vehicle Expense & Fleet Management Platform (MERN Stack)

**Vehixa** is a full-stack MERN vehicle expense, trip tracking, fuel, maintenance, and budgeting platform.

## Monorepo Structure

- `rideexpense-backend/` — Node.js + Express + TypeScript + MongoDB (Mongoose) REST API (`/api/v1`)
- `rideexpense-web/` — React + TypeScript + Vite + Tailwind CSS web application
- `docker-compose.yml` — Local MongoDB 8.0 container setup

## Prerequisites

- Node.js 20+ (tested on v25.6.1)
- npm 10+
- MongoDB 8.0 (local `mongod` or Docker via `docker compose up -d`)

## Setup & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start MongoDB**:
   - Cloud MongoDB Atlas or local `mongod`
   - Or using Docker:
     ```bash
     docker compose up -d
     ```

3. **Configure environment variables**:
   - Backend: `rideexpense-backend/.env` (see `rideexpense-backend/.env.example`)
   - Web: `rideexpense-web/.env` (see `rideexpense-web/.env.example`)

4. **Run development servers**:
   ```bash
   # Terminal 1: Backend API (http://localhost:5000/api/v1)
   npm run dev:backend

   # Terminal 2: Web Frontend (http://localhost:5173)
   npm run dev:web
   ```

5. **Build, Lint & Test**:
   ```bash
   npm run build
   npm run lint
   npm run test:backend
   ```
