# AI Chatbot with Next.js + NestJS + LangChain

A modern, decoupled chatbot application using a **Next.js** frontend with Server-Side Rendering (SSR) and a **NestJS** backend with LangChain integration.

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
npm install
```

## Running the Application

Started both applications with a single command:
```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:3001](http://localhost:3001)

---

## Architecture

This project uses a **Decoupled Architecture**:

1.  **Frontend (Next.js)**: 
    - Uses **App Router**.
    - **Server Components (SSR)**: The landing page fetches initial system health and LLM provider status directly from the API before rendering.
    - **Client Components**: Interactive chat interface with streaming support.
2.  **Backend (NestJS)**:
    - **Modular Design**: Structured into `ChatModule`, `ChatService`, and `ChatController`.
    - **Dependency Injection**: Full use of NestJS DI for services and configuration.

---

## LLM Provider Options

### Option 1: Google Gemini (Free Tier with Quota Limits)

**Pros:**
- Completely free
- Good quality responses
- Easy setup

**Cons:**
- Daily quota limits
- Rate limiting after quota exceeded

**Setup:**
```bash
# .env file
USE_GOOGLE_LLM=true
GOOGLE_API_KEY=your_google_api_key
```

**Get API Key:**
1. Visit https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy and paste into `.env`

**Run:**
```bash
npm run dev
```

---

### Option 2: OpenAI (Paid)

**Pros:**
- Fastest and most capable model
- No quota limits (only rate limits)
- High quality

**Cons:**
- Requires paid account
- Costs money (but very cheap for light usage)

**Setup:**
```bash
# .env file
OPENAI_API_KEY=your_openai_api_key
USE_GOOGLE_LLM=false
USE_OLLAMA=false
```

**Get API Key:**
1. Visit https://platform.openai.com/account/billing/overview
2. Add a payment method
3. Generate API key at https://platform.openai.com/api-keys
4. Copy and paste into `.env`

**Cost:**
- gpt-4o-mini: ~$0.15 per million input tokens
- Light usage typically costs $1-5/month

**Run:**
```bash
npm run server
```

---

### Option 3: Ollama (Local, Completely Free)

**Pros:**
- Completely free
- No API keys needed
- Runs entirely offline
- No quota limits

**Cons:**
- Slower responses (depends on your CPU)
- Requires local installation
- Smaller models (less capable)

**Setup:**

1. **Install Ollama:**
   - Download from https://ollama.ai
   - Install and run

2. **Download a model (choose one):**
   ```bash
   ollama pull llama2           # 4GB, good balance
   ollama pull mistral          # 5GB, faster
   ollama pull neural-chat      # 4GB, good for chat
   ```

3. **Configure your app:**
   ```bash
   # .env file
   USE_OLLAMA=true
   USE_GOOGLE_LLM=false
   ```

4. **Verify Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

---

## Available Scripts

```bash
# Start both Frontend and Backend in development mode
npm run dev

# Start only the Next.js Frontend
npm run dev:frontend

# Start only the NestJS Backend
npm run dev:backend

# Build the Next.js Frontend for production
npm run build

# Start the production Frontend
npm start

# Format code with Prettier
npm run format
```

---

## API Endpoints (NestJS - Port 3001)

### Health Check
```
GET http://localhost:3001/api/health
```
Returns status and active LLM provider (OpenAI, Google, or Ollama).

### Chat with History
```
POST http://localhost:3001/api/chat/history
Content-Type: application/json

{
  "message": "What did we discuss before?",
  "sessionId": "user-123"
}
```

### Streaming Chat (Server-Sent Events)
```
POST http://localhost:3001/api/chat/stream
Content-Type: application/json

{
  "message": "Tell me a story",
  "sessionId": "user-123"
}
```

---

## Troubleshooting

### "EADDRINUSE: address already in use :::3001"
This happens if a previous process is still running. Kill it before restarting:
- **Windows**: `netstat -ano | findstr :3001` then `taskkill /F /PID <PID>`
- **Mac/Linux**: `lsof -i :3001` then `kill -9 <PID>`

### CORS errors in browser
- The backend is configured to allow `http://localhost:3000`. 
- CORS setup is handled in `server/src/main.ts` via `app.enableCors()`.

---

## Project Structure

```
chatbot_ai/
├── app/                    # Next.js App Router (Frontend)
│   ├── chat/              # Chat application page
│   ├── image-processing/  # Image analysis page
│   ├── language-learning/ # Language education page
│   └── page.tsx           # Landing page
├── components/             # UI Components
│   ├── ChatUI.tsx         # Standard chat interface
│   ├── imageProcessing/   # Image processing UI & styles
│   └── languageLearning/  # Language learning UI & styles
├── server/                 # NestJS Application (Backend)
│   └── src/
│       ├── chat/          # Chat service logic
│       ├── image-processing/ # Image analysis logic
│       └── language-learning/# Language processing logic
│       └── main.ts        # NestJS Entry Point
├── .env                    # API keys
└── package.json            # Scripts & Workspace Dependencies
```

## Core Components

- **ChatUI**: A robust interface for text-based AI interactions, supporting streaming and chat history.
- **ImageProcessingUI**: Specific UI for uploading and analyzing images via AI.
- **LanguageLearningUI**: Specialized interface designed for language practice and learning exercises.

---

## Comparison

| Feature     | Gemini   | OpenAI    | Ollama       |
| ----------- | -------- | --------- | ------------ |
| Cost        | Free     | Paid      | Free         |
| Quality     | Good     | Excellent | Good         |
| Speed       | Fast     | Fast      | Slow         |
| Offline     | No       | No        | Yes          |
| Setup       | Easy     | Easy      | Medium       |
| Daily Limit | Yes      | No        | No           |
| Internet    | Required | Required  | Not required |

---

## Environment Variables

```env
# Choose one:
# For OpenAI (requires paid account)
OPENAI_API_KEY=sk-...

# For Google Gemini (free tier)
GOOGLE_API_KEY=AIza...
USE_GOOGLE_LLM=true

# For Ollama (local, free)
USE_OLLAMA=true
```

---

## License

MIT
