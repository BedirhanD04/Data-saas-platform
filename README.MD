# Smart Data Analysis Platform

A full-stack B2B SaaS platform where users upload a CSV or Excel file and instantly get row/column statistics and auto-generated charts — no spreadsheet wrangling required.

**Live demo:** [data-saas-platform.vercel.app](https://data-saas-platform.vercel.app)

## Features

- User registration & login with JWT-based authentication
- Drag-and-drop file upload (CSV / Excel)
- Automatic statistical analysis (mean, min, max) for every numeric column, with no hardcoded column names
- Auto-generated bar charts for the analyzed data
- Persistent dataset history per user (view and delete past uploads)
- Rate limiting and file-size limits to protect the backend
- Fully deployed, production-ready architecture

## Tech Stack

**Frontend**
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Recharts for data visualization

**Backend**
- Node.js + Express — authentication, user management, dataset storage
- Python + FastAPI — file parsing and statistical analysis (pandas)
- PostgreSQL — persistent storage

**Infrastructure**
- Vercel — frontend hosting
- Railway — backend services & database hosting
- JWT + bcrypt for authentication and password security

## Architecture

Browser
│
├─→ Next.js frontend (Vercel)
│ │
│ ├─→ FastAPI service (Railway) — file analysis
│ │
│ └─→ Express API (Railway) — auth & dataset storage
│ │
│ └─→ PostgreSQL (Railway)


## Running locally

Three services need to run in parallel:

```bash
# Frontend
cd data-saas
npm install
npm run dev

# Node.js API
cd api-service
npm install
node index.js

# Python data service
cd data-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Each service needs its own `.env` file (see `.env.example` if provided) with database credentials and a JWT secret.

## What I learned building this

This project was built end-to-end, including authentication, database design, a multi-service architecture (three separate backend services talking to each other), and deploying all of it to production with proper CORS, SSL, and environment variable configuration across two different hosting platforms.
