# Self-Hosted API Setup Guide

## Environment Variables for Edge Functions

On your self-hosted Supabase, set these secrets:

```bash
# Your AI API endpoint (OpenAI-compatible format)
AI_API_URL=http://localhost:11434/v1/chat/completions   # Ollama example
# AI_API_URL=https://api.openai.com/v1/chat/completions  # OpenAI example
# AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions  # Gemini example

# Your API key
AI_API_KEY=your-api-key-here

# Model name (must match your provider)
AI_MODEL=gemma2:27b           # Ollama example
# AI_MODEL=gpt-4o             # OpenAI example
# AI_MODEL=gemini-2.5-pro     # Gemini example

# Your app URL where market data file is served
APP_URL=http://your-server-ip

# Supabase (auto-set in self-hosted Supabase)
SUPABASE_URL=http://your-server-ip:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Setting Secrets in Self-Hosted Supabase

```bash
# Using supabase CLI
supabase secrets set AI_API_URL=http://localhost:11434/v1/chat/completions
supabase secrets set AI_API_KEY=your-key
supabase secrets set AI_MODEL=gemma2:27b
supabase secrets set APP_URL=http://your-server-ip
```

## Option A: Ollama (Free, Local)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model good for JSON analysis
ollama pull gemma2:27b

# Ollama runs at http://localhost:11434 by default
# OpenAI-compatible endpoint: http://localhost:11434/v1/chat/completions
```

Set:
```
AI_API_URL=http://localhost:11434/v1/chat/completions
AI_API_KEY=ollama
AI_MODEL=gemma2:27b
```

## Option B: OpenAI API

Get key from https://platform.openai.com/api-keys

Set:
```
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

## Option C: Google Gemini API

Get key from https://aistudio.google.com/apikey

Set:
```
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_API_KEY=AIza...
AI_MODEL=gemini-2.5-pro
```

## API Format Required

Your API must accept OpenAI-compatible chat completions format:

```json
POST /v1/chat/completions
{
  "model": "your-model",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "max_tokens": 8192
}
```

Response format:
```json
{
  "choices": [
    {
      "message": {
        "content": "{ ... JSON analysis ... }"
      }
    }
  ]
}
```

## Frontend Build

```bash
# Set your Supabase URL
VITE_SUPABASE_URL=http://your-server-ip:8000
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

npm run build
# Serve dist/ folder with Nginx
```
