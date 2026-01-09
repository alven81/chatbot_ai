# AI Chatbot with Vite + React + LangChain

A full-stack chatbot application using React frontend and Express backend with LangChain integration.

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
npm install
```

## Running the Application

### Terminal 1: Start the Server
```bash
npm run server
```

### Terminal 2: Start the Client
```bash
npm run client
```

Then open http://localhost:5173 in your browser.

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
npm run server
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
   npm run server
   ```

---

## Available Scripts

```bash
# Build TypeScript
npm run build

# Start compiled server
npm start

# Development server (CLI)
npm run dev

# Start backend server
npm run server

# Start frontend dev server
npm run client

# Build frontend for production
npm run client:build

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

---

## API Endpoints

### Health Check
```
GET http://localhost:3001/api/health
```
Returns LLM status and API key information.

### Simple Chat (No History)
```
POST http://localhost:3001/api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?"
}
```

### Chat with History
```
POST http://localhost:3001/api/chat/history
Content-Type: application/json

{
  "message": "What did we discuss before?",
  "sessionId": "user-123"
}
```

### Streaming Chat
```
POST http://localhost:3001/api/chat/stream
Content-Type: application/json

{
  "message": "Tell me a story",
  "sessionId": "user-123"
}
```

### Clear Chat History
```
POST http://localhost:3001/api/chat/clear
Content-Type: application/json

{
  "sessionId": "user-123"
}
```

---

## Troubleshooting

### "OpenAI quota exceeded" error
- OpenAI API requires a paid account
- Switch to Google Gemini: `USE_GOOGLE_LLM=true`
- Or use Ollama: `USE_OLLAMA=true`

### "Google API quota exceeded" error
- Gemini free tier has daily limits
- Wait a few hours for quota reset
- Or switch to Ollama for unlimited access

### Ollama connection refused
- Make sure Ollama is installed and running
- Check it's accessible: `curl http://localhost:11434/api/tags`
- Start Ollama if not running

### CORS errors in browser
- Backend server is running on `http://localhost:3001`
- Frontend is running on `http://localhost:5173`
- CORS is enabled, should work fine

---

## Project Structure

```
chatbot_ai/
├── client/                 # React Vite frontend
│   ├── src/
│   │   ├── App.tsx        # Main chat component
│   │   ├── App.css        # Styling
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/
│   └── index.ts           # Express API server
├── .env                    # API keys
├── .prettierrc             # Code formatting
└── package.json
```

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
