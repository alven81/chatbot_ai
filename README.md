# 🤖 AI Chatbot — Next.js + NestJS + LangChain

A modern, full-stack AI application with a **Next.js** frontend (App Router + SSR) and a **NestJS** backend powered by **LangChain**.  
Supports multiple LLM providers and four distinct AI-powered features.

---

## ✨ Features

| Feature                      | Description                                                    |
| ---------------------------- | -------------------------------------------------------------- |
| 💬 **Intelligent Chat**       | Context-aware conversations with session history and streaming |
| 🖼️ **Image Processing**       | AI-powered image analysis and style transformation             |
| 🌍 **Language Learning**      | Interactive tutor with message correction and grammar feedback |
| 🔍 **Text Recognition (OCR)** | Extract text from images using specialized local vision models |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
npm install
```

### Run

```bash
# Start both Frontend and Backend concurrently
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/swagger

---

## 🐳 Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine + Compose)
- Docker Desktop must be running before any `docker compose` commands

### Setup

**1. Copy and fill in your environment file:**

```bash
copy example.env .env
```

For Docker, make sure `.env` includes:

```env
USE_OLLAMA=true
USE_GOOGLE_LLM=true
USE_OPENAI_LLM=true

# Required when using Ollama with Docker — points to your host machine
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1

GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

> `host.docker.internal` is a Docker Desktop special hostname that resolves to your host machine — required so the backend container can reach Ollama running locally.

---

### Build & Run

```bash
# Build images and start both containers (foreground with live logs)
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/swagger

Press `Ctrl+C` to stop.

---

### Development — Hot Reload (Watch Mode)

Source files are mounted as volumes, so code changes reflect **instantly** without rebuilding:

```bash
# Start containers (no rebuild needed after the first --build)
docker compose up
```

| Path            | Service                     |
| --------------- | --------------------------- |
| `./server/`     | Backend (NestJS)            |
| `./app/`        | Frontend (Next.js pages)    |
| `./components/` | Frontend (React components) |
| `./services/`   | Frontend (API client)       |

---

### Updating Containers

| Scenario                        | Command                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| Code change (hot reload active) | Just save the file — no command needed                            |
| Added/removed npm packages      | `docker compose up --build`                                       |
| Rebuild a single service        | `docker compose build backend` or `docker compose build frontend` |
| Restart without rebuild         | `docker compose up`                                               |
| Stop and remove containers      | `docker compose down`                                             |

---

### Run in Background (Detached)

```bash
docker compose up -d

# Follow logs
docker compose logs -f

# Follow a specific service
docker compose logs -f backend
docker compose logs -f frontend

# Stop
docker compose down
```

---

## 🏗️ Architecture

```
Browser (Next.js :3000)  ──→  NestJS API (:3001)  ──→  LLM Provider
                                    │                   (OpenAI / Google / Ollama)
                                    ↓
                           LlmProviderService
                           (shared, injected globally)
```

**Frontend (Next.js)**
- App Router with SSR — the landing page fetches provider health on the server before rendering
- Client Components handle streaming via Server-Sent Events (SSE)

**Backend (NestJS)**
- Four feature modules: `ChatModule`, `ImageProcessingModule`, `LanguageLearningModule`, `TextRecognitionModule`
- Shared `LlmProviderModule` — globally available service that creates and configures LLM instances
- Body size limit raised to **50 MB** to support base64 image payloads
- Swagger documentation auto-generated at `/swagger`

---

## 🤖 LLM Provider Options

### Option 1: 🌟 Google Gemini (Free Tier)

**Pros:** Free · Good quality · Easy setup  
**Cons:** Daily quota limits

```env
USE_GOOGLE_LLM=true
USE_OPENAI_LLM=false
USE_OLLAMA=false
GOOGLE_API_KEY=your_key_here
```

Get API Key: https://aistudio.google.com/apikey

---

### Option 2: 💳 OpenAI (Paid)

**Pros:** Highest quality · Fastest · No quota  
**Cons:** Costs money

```env
USE_OPENAI_LLM=true
USE_GOOGLE_LLM=false
USE_OLLAMA=false
OPENAI_API_KEY=your_key_here
```

Get API Key: https://platform.openai.com/api-keys  
Cost: `gpt-4o-mini` ~$0.15 / 1M input tokens

---

### Option 3: 🏠 Ollama (Local, Completely Free)

**Pros:** Free · Offline · No quotas · No API keys  
**Cons:** Slower · Requires local CPU/GPU · Smaller models

**1. Install Ollama:** https://ollama.ai

**2. Pull recommended models:**

```bash
# General purpose chat + vision
ollama pull llava

# Lightweight vision model
ollama pull moondream

# Specialized OCR model (required for Text Recognition)
ollama pull yasserrmd/Nanonets-OCR2-3B:latest
```

**3. Configure:**

```env
USE_OLLAMA=true
USE_GOOGLE_LLM=false
USE_OPENAI_LLM=false
```

**4. Verify Ollama is running:**

```bash
curl http://localhost:11434/api/tags
```

---

## 📜 Available Scripts

```bash
npm run dev              # Start both Frontend and Backend concurrently (recommended)
npm run dev:frontend     # Start only Next.js frontend (port 3000)
npm run dev:backend      # Start only NestJS backend (port 3001)
npm run build            # Build Next.js for production
npm start                # Start the production Next.js server
npm run format           # Format all code with Prettier
npm run check-types      # Run TypeScript type check (no emit)
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`  
Full interactive docs: **http://localhost:3001/swagger**

### 💬 Chat

| Method | Endpoint        | Description                                       |
| ------ | --------------- | ------------------------------------------------- |
| `POST` | `/chat/history` | Send a message and get a full response            |
| `POST` | `/chat/stream`  | Send a message and get a streaming response (SSE) |
| `POST` | `/chat/clear`   | Clear chat history for a session                  |
| `GET`  | `/chat/health`  | Health check and active LLM provider info         |

```json
// POST /api/chat/history or /api/chat/stream
{
  "message": "Tell me a joke",
  "sessionId": "user-123",
  "modelId": "gpt-4o-mini"
}

// POST /api/chat/clear
{ "sessionId": "user-123" }
```

### 🖼️ Image Processing

| Method | Endpoint                    | Description                               |
| ------ | --------------------------- | ----------------------------------------- |
| `POST` | `/image-processing/process` | Analyze and transform an image            |
| `GET`  | `/image-processing/health`  | Health check and active LLM provider info |

```json
// POST /api/image-processing/process
{
  "imageBase64": "...",
  "styleDescription": "winter jacket, urban style",
  "modelId": "dall-e-3"
}
```

### 🌍 Language Learning

| Method | Endpoint                    | Description                                       |
| ------ | --------------------------- | ------------------------------------------------- |
| `POST` | `/language-learning/stream` | Start a language tutor session with SSE streaming |
| `POST` | `/language-learning/clear`  | Clear session history                             |
| `GET`  | `/language-learning/health` | Health check and active LLM provider info         |

```json
// POST /api/language-learning/stream
{
  "message": "Hola, como estas?",
  "sessionId": "user-123",
  "learningLanguage": "Spanish",
  "userLanguage": "English",
  "learningLevel": "Beginner",
  "userProfession": "Software Engineer",
  "modelId": "gpt-4o"
}
```

### 🔍 Text Recognition (OCR)

| Method | Endpoint                      | Description                               |
| ------ | ----------------------------- | ----------------------------------------- |
| `POST` | `/text-recognition/recognize` | Extract text from a base64-encoded image  |
| `GET`  | `/text-recognition/health`    | Health check and active LLM provider info |

```json
// POST /api/text-recognition/recognize
{
  "imageBase64": "...",
  "language": "Auto define language",
  "modelId": "yasserrmd/Nanonets-OCR2-3B:latest"
}
```

---

## 🗂️ Project Structure

```
chatbot_ai/
├── app/                         # Next.js App Router (Frontend)
│   ├── chat/                   # Chat page
│   ├── image-processing/       # Image processing page
│   ├── language-learning/      # Language learning page
│   ├── text-recognition/       # OCR page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page (SSR health fetch)
├── components/                  # Reusable UI components
│   ├── ChatUI.tsx              # Chat interface (streaming + history)
│   ├── imageProcessing/        # Image processing UI and styles
│   ├── languageLearning/       # Language learning UI and styles
│   └── textRecognition/        # OCR UI and styles
├── server/                      # NestJS Application (Backend)
│   └── src/
│       ├── app.module.ts       # Root module
│       ├── main.ts             # Entry point (port 3001)
│       ├── chat/               # Chat module (history + streaming)
│       ├── image-processing/   # Image analysis module
│       ├── language-learning/  # Language tutor module
│       ├── text-recognition/   # OCR module
│       └── shared/
│           └── llm-provider/   # Global LLM factory service
├── services/                    # Frontend API client helpers
├── example.env                  # Environment variable template
└── package.json
```

---

## 🔧 Environment Variables

Copy `example.env` to `.env` and fill in your keys:

```env
# Enable/disable providers (set true or false)
USE_OLLAMA=true
USE_GOOGLE_LLM=true
USE_OPENAI_LLM=true

# API Keys
GOOGLE_API_KEY=
OPENAI_API_KEY=
```

---

## 🆚 Provider Comparison

| Feature     | 🌟 Gemini | 💳 OpenAI  | 🏠 Ollama   |
| ----------- | -------- | --------- | ---------- |
| Cost        | Free     | Paid      | Free       |
| Quality     | Good     | Excellent | Good       |
| Speed       | Fast     | Fast      | Slow       |
| Offline     | ❌        | ❌         | ✅          |
| Setup       | Easy     | Easy      | Medium     |
| Daily Limit | ✅        | ❌         | ❌          |
| Internet    | Required | Required  | Not needed |

---

## 🩺 Troubleshooting

### `EADDRINUSE: address already in use :::3001`

A previous process is still running. Kill it first:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Mac / Linux
lsof -i :3001
kill -9 <PID>
```

### CORS errors

CORS is open (`app.enableCors()` in `server/src/main.ts`). Changing the frontend port requires no additional backend config.

### Large image uploads failing

The server accepts payloads up to **50 MB**. If you hit this limit, reduce image resolution before uploading.

### 🐳 Docker — Backend container unhealthy

The health check polls `/api/chat/health` via Node.js. If the backend takes longer to boot, it may fail retries:

```bash
# Check what the backend is actually doing
docker compose logs backend
```

If healthy but slow, increase `start_period` in `docker-compose.yml`.

### 🐳 Docker — Ollama not reachable from container

Ensure `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1` is set in `.env`.  
Also verify Ollama is running on your host:

```bash
curl http://localhost:11434/api/tags
```

### 🐳 Docker — `npm ci` fails during build (lock file out of sync)

The `package-lock.json` is out of sync with `package.json`. Regenerate it first:

```bash
npm install
docker compose up --build
```

---

## 📄 License

MIT
