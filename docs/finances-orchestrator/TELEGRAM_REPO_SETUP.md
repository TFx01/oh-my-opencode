# Telegram Repository Setup - Reference Guide

> **Note**: This is a reference document for the architecture. The actual Telegram repository should be created as a **separate repository**.

---

## Overview

This document describes the architecture and integration patterns for the Telegram repository that triggers OpenCode sessions and receives summaries using **Tailscale** for secure network connectivity.

## Architecture with Tailscale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM REPO (Python)                              │
│                                                                          │
│   ┌──────────────┐                                                      │
│   │ Telegram Bot │◀─── User Messages (from anywhere!)                   │
│   │ API          │                                                      │
│   └──────┬───────┘                                                      │
│          │                                                              │
│          ▼                                                              │
│   ┌──────────────┐    HTTP REST API    ┌─────────────────────────────┐ │
│   │ Session      │────────────────────►│  Wrapper Server (MacBook)   │ │
│   │ Manager      │◀────────────────────│  :5147                       │ │
│   │              │                      │                             │ │
│   └──────────────┘                      │  ┌───────────────────────┐  │ │
│                                          │  │  OpenCode SDK         │  │ │
│   ┌──────────────┐                      │  │                       │  │ │
│   │ Logs & Docs  │                      │  │  - finances-agent     │  │ │
│   │ • sessions/  │                      │  │  - wallet-agent       │  │ │
│   │ • docs/      │                      │  │  - budget-analyst     │  │ │
│   └──────────────┘                      │  │  - investment-agent   │  │ │
│                                          │  │  - tax-specialist-br  │  │ │
│   🌐 Runs from anywhere                  │  │  - regulatory-agent   │  │ │
│   🔒 Connected via Tailscale             │  └───────────────────────┘  │ │
│                                          │                             │ │
└──────────────────────────────────────────│─────────────────────────────┘ │
                                           │                               │
                                           │ Tailscale IP (100.x.x.x)     │
                                           │ SSH Tunnel ou Tailscale Serve│
                                           ▼                               │
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                                │
│                                                                          │
│   tables: users, transactions, portfolios, budgets, analyses, docs      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Requisição

```
1. User → Telegram Bot: "Analise meu portfólio"
2. Telegram → Wrapper (via Tailscale): POST /session/start
3. Wrapper → OpenCode SDK: run_agent("finances-orchestrator", message)
4. OpenCode SDK → Supabase: Query portfolio data
5. OpenCode SDK → Exa MCP: Web research (opcional)
6. OpenCode SDK → Wrapper: Agent response
7. Wrapper → Telegram: JSON response
8. Telegram → User: "📊 Análise do seu portfólio..."
```

### Why Tailscale?

| Feature | Tailscale | Traditional VPN | Ngrok |
|---------|-----------|-----------------|-------|
| **Setup** | Minutes | Hours | Minutes |
| **Device count** | Unlimited | Limited | N/A |
| **IP Address** | Stable persistent IP | Dynamic | Ephemeral |
| **Speed** | Full bandwidth | Full bandwidth | Throttled |
| **Cost** | Free for personal | Paid | Free tier limited |
| **SSH** | Native | Native | No |
| **Security** | WireGuard (NSA-grade) | Varies | HTTPS only |

---

## File Structure

```
telegram-repo/
├── src/
│   ├── bot.py                     # Telegram bot handler
│   ├── session_manager.py         # Session lifecycle management
│   ├── ssh_tunnel.py              # SSH tunnel to OpenCode
│   ├── webhook_handler.py         # Webhook for session completion
│   ├── config.py                  # Configuration
│   ├── logger.py                  # Logging utilities
│   └── keyboards/                 # Custom keyboards
│       └── main_menu.py
├── tests/
│   ├── test_bot.py
│   ├── test_session_manager.py
│   └── test_ssh_tunnel.py
├── logs/
│   ├── sessions/                  # Session logs
│   │   ├── 2024-01-15-session-abc.md
│   │   └── ...
│   └── daily/
│       ├── 2024-01-15-summary.md
│       └── ...
├── docs/
│   └── reports/                   # Generated reports
│       ├── investments/
│       ├── budgets/
│       └── taxes/
├── config.yaml                    # Configuration
├── requirements.txt               # Python dependencies
├── Makefile                       # Development commands
└── README.md                      # Main entry point
```

---

## Installation

### Prerequisites

- Python 3.11+
- **Tailscale** installed on both devices
- **SSH enabled** on your MacBook
- Telegram Bot Token (from @BotFather)
- Supabase project (optional, for persistent logs)

### MacBook Setup (Wrapper Server)

O wrapper server deve rodar **no seu MacBook**:

```bash
# 1. Instalar dependências
pip install fastapi uvicorn pydantic python-multipart

# 2. Criar arquivo wrapper_server.py (código na seção abaixo)

# 3. Executar o servidor
python wrapper_server.py

# 4. Expor via Tailscale (veja seção Tailscale Setup)
```

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/telegram-repo.git
cd telegram-repo

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp config.example.yaml config.yaml
# Edit config.yaml with your settings

# Run tests
make test

# Start bot
make run
```

### requirements.txt

```txt
python-telegram-bot>=20.0
httpx>=0.25.0
asyncssh>=2.0.0
python-dotenv>=1.0.0
pyyaml>=6.0.0
loguru>=0.7.0
supabase>=2.0.0
pytest>=7.0.0
pytest-asyncio>=0.21.0
```

---

## Configuration

### config.yaml

```yaml
# Telegram Bot Configuration
bot:
  token: "YOUR_BOT_TOKEN_HERE"
  chat_id: 123456789  # Your Telegram chat ID

# OpenCode Configuration (via Tailscale)
opencode:
  url: "http://localhost:5147"  # Local endpoint (tunnel maps to this)
  timeout: 300  # Session timeout in seconds

# Tailscale Configuration
tailscale:
  enabled: true
  # Get your MacBook's Tailscale IP with: tailscale ip
  opencode_ip: "100.x.x.x"  # Your MacBook's Tailscale IP
  opencode_ssh_port: 22  # SSH port on your MacBook
  ssh_user: "your_username"  # SSH username on MacBook
  ssh_key: "~/.ssh/id_ed25519"  # SSH private key path

# Supabase Configuration (optional)
supabase:
  url: "https://your-project.supabase.co"
  key: "your-anon-key"
  enabled: true

# Logging Configuration
logging:
  level: "INFO"
  format: "[{time}] {message}"
  session_logs_dir: "logs/sessions"
  daily_logs_dir: "logs/daily"

# Features
features:
  voice_enabled: true
  image_enabled: true
  document_enabled: true
  session_continuation: true
```

---

### Tailscale Setup (One-time)

```bash
# 1. Install Tailscale on your MacBook
brew install tailscale

# 2. Authenticate (will open browser)
sudo tailscale up

# 3. Get your MacBook's Tailscale IP
tailscale ip
# Example output: 100.100.100.100

# 4. Enable SSH on your MacBook
# System Settings → Sharing → Enable "Remote Login"

# 5. Add SSH key to authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

---

## Core Components

### Bot Handler

```python
# src/bot.py

import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from session_manager import SessionManager
from config import config

async def handle_message(update: Update, context):
    """Handle incoming text messages"""
    user = update.effective_user
    message = update.message.text
    
    # Get or create session
    session = session_manager.get_or_create(user.id)
    
    if session.is_active:
        response = await session.continue_session(message)
    else:
        response = await session.start_new(message)
    
    await update.message.reply_text(response, parse_mode='Markdown')

async def handle_voice(update: Update, context):
    """Handle voice messages"""
    voice = update.message.voice
    file = await voice.get_file()
    
    audio_path = f"/tmp/{voice.file_id}.ogg"
    await file.download_to_drive(audio_path)
    
    session = session_manager.get_or_create(update.effective_user.id)
    response = await session.send_audio(audio_path)
    
    await update.message.reply_text(response, parse_mode='Markdown')

async def handle_photo(update: Update, context):
    """Handle photos (receipts, etc.)"""
    photo = update.message.photo[-1]
    file = await photo.get_file()
    
    image_path = f"/tmp/{photo.file_id}.jpg"
    await file.download_to_drive(image_path)
    
    session = session_manager.get_or_create(update.effective_user.id)
    response = await session.send_image(image_path)
    
    await update.message.reply_text(response, parse_mode='Markdown')

async def start_command(update: Update, context):
    """Handle /start command"""
    await update.message.reply_text(
        "🤖 *Olá! Sou seu assistente de finanças.*\n\n"
        "Posso ajudar você com:\n"
        "• 💰 Análise de transações e saldo\n"
        "• 📊 Orçamentos e projeções\n"
        "• 📈 Investimentos e portfólio\n"
        "• 🏛️ Impostos e compliance\n\n"
        "Como posso ajudar hoje?",
        parse_mode='Markdown'
    )

async def help_command(update: Update, context):
    """Handle /help command"""
    await update.message.reply_text(
        "📚 *Comandos disponíveis:*\n\n"
        "/start - Iniciar conversa\n"
        "/help - Mostrar esta ajuda\n"
        "/status - Verificar status da sessão\n\n"
        "💡 *Dicas:*\n"
        "• Envie mensagens de voz para registrar despesas\n"
        "• Envie fotos de recibos para análise\n"
        "• Pergunte sobre seu orçamento ou investimentos",
        parse_mode='Markdown'
    )

async def status_command(update: Update, context):
    """Check session status"""
    session = session_manager.get_or_create(update.effective_user.id)
    status = await session.get_status()
    
    await update.message.reply_text(
        f"📊 *Status da Sessão*\n\n"
        f"Status: `{status['status']}`\n"
        f"Sessão: `{status.get('session_id', 'N/A')}`\n"
        f"Iniciada: `{status.get('started_at', 'N/A')}`",
        parse_mode='Markdown'
    )

async def main():
    """Main entry point"""
    app = Application.builder().token(config.bot.token).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    
    print("🤖 Telegram bot started")
    await app.run_polling()

if __name__ == "__main__":
    asyncio.run(main())
```

### Session Manager

```python
# src/session_manager.py

import httpx
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from loguru import logger
from config import config

@dataclass
class Session:
    chat_id: int
    opencode_session_id: Optional[str] = None
    is_active: bool = False
    started_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None

class SessionManager:
    def __init__(self):
        self.sessions: dict[int, Session] = {}
        self.http_client = httpx.AsyncClient(timeout=config.opencode.timeout)
        self.opencode_url = config.opencode.url
    
    def get_or_create(self, chat_id: int) -> Session:
        if chat_id not in self.sessions:
            logger.info(f"Creating new session for chat {chat_id}")
            self.sessions[chat_id] = Session(chat_id=chat_id)
        return self.sessions[chat_id]
    
    async def start_new(self, message: str) -> str:
        session = self.get_or_create(self.chat_id)
        
        logger.info(f"Starting new session for chat {session.chat_id}")
        
        try:
            response = await self.http_client.post(
                f"{self.opencode_url}/session/start",
                json={
                    "message": message,
                    "chat_id": session.chat_id,
                    "model": "google/gemini-3-pro-preview"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                session.opencode_session_id = data["session_id"]
                session.is_active = True
                session.started_at = datetime.now()
                session.last_activity = datetime.now()
                
                logger.success(f"Session started: {session.opencode_session_id}")
                
                return (
                    f"🔄 *Processando sua solicitação...*\n\n"
                    f"📊 Session ID: `{data['session_id']}`\n\n"
                    f"⏳ Aguarde a análise ser concluída."
                )
            else:
                logger.error(f"Failed to start session: {response.status_code}")
                return "❌ Erro ao iniciar sessão. Tente novamente."
                
        except Exception as e:
            logger.error(f"Error starting session: {e}")
            return "❌ Erro de conexão. Verifique se o servidor OpenCode está ativo."
    
    async def continue_session(self, message: str) -> str:
        session = self.get_or_create(self.chat_id)
        
        if not session.is_active or not session.opencode_session_id:
            return await self.start_new(message)
        
        logger.info(f"Continuing session {session.opencode_session_id}")
        
        try:
            response = await self.http_client.post(
                f"{self.opencode_url}/session/{session.opencode_session_id}/continue",
                json={"message": message}
            )
            
            session.last_activity = datetime.now()
            return response.json()["response"]
            
        except Exception as e:
            logger.error(f"Error continuing session: {e}")
            return "❌ Erro ao continuar sessão."
    
    async def send_audio(self, audio_path: str) -> str:
        session = self.get_or_create(self.chat_id)
        
        if not session.is_active:
            await self.start_new("Análise de áudio")
        
        logger.info(f"Sending audio to session {session.opencode_session_id}")
        
        with open(audio_path, "rb") as f:
            files = {"audio": f}
            data = {"chat_id": session.chat_id}
            response = await self.http_client.post(
                f"{self.opencode_url}/session/{session.opencode_session_id}/audio",
                files=files,
                data=data
            )
        
        return response.json()["response"]
    
    async def send_image(self, image_path: str) -> str:
        session = self.get_or_create(self.chat_id)
        
        if not session.is_active:
            await self.start_new("Análise de imagem")
        
        logger.info(f"Sending image to session {session.opencode_session_id}")
        
        with open(image_path, "rb") as f:
            files = {"image": f}
            data = {"chat_id": session.chat_id}
            response = await self.http_client.post(
                f"{self.opencode_url}/session/{session.opencode_session_id}/image",
                files=files,
                data=data
            )
        
        return response.json()["response"]
    
    async def get_status(self, chat_id: int) -> dict:
        session = self.sessions.get(chat_id)
        if not session:
            return {"status": "no_active_session"}
        
        return {
            "status": "active" if session.is_active else "completed",
            "session_id": session.opencode_session_id,
            "started_at": session.started_at.isoformat() if session.started_at else None
        }
```

### SSH Tunnel (via Tailscale)

```python
# src/ssh_tunnel.py

import asyncio
import asyncssh
from loguru import logger
from config import config

async def check_tunnel() -> bool:
    """Check if SSH tunnel is active via Tailscale"""
    try:
        async with asyncssh.connect(
            host=config.tailscale.opencode_ip,
            port=config.tailscale.opencode_ssh_port,
            username=config.tailscale.ssh_user,
            client_keys=[config.tailscale.ssh_key],
        ) as conn:
            # Try to connect - if successful, tunnel is active
            logger.success("SSH tunnel is active via Tailscale")
            return True
    except Exception as e:
        logger.warning(f"SSH tunnel not active: {e}")
        return False

async def create_tunnel(
    remote_host: str = None,  # Will use config.tailscale.opencode_ip
    remote_port: int = 5147,
    local_port: int = 5147
):
    """
    Create SSH reverse tunnel to OpenCode server via Tailscale.
    
    Prerequisites:
    1. Install Tailscale on both devices
    2. Authenticate both to your Tailscale network
    3. Get MacBook's Tailscale IP: `tailscale ip`
    4. Enable SSH on MacBook

    This creates a reverse tunnel where:
    - Remote side (Wrapper server): Tailscale IP:5147 → OpenCode (:4096)
    - Local side (Telegram repo): localhost:5147
    """
    host = config.tailscale.opencode_ip
    logger.info(f"Creating SSH tunnel via Tailscale: {host}:{remote_port} -> localhost:{local_port}")
    logger.info(f"   Tailscale IP: {host}")
    
    try:
        async with asyncssh.connect(
            host=config.tailscale.opencode_ip,
            port=config.tailscale.opencode_ssh_port,
            username=config.tailscale.ssh_user,
            client_keys=[config.tailscale.ssh_key],
            known_hosts=None,  # Disable for local network
        ) as conn:
            # Create reverse tunnel
            await conn.create_reverse_tunnel(
                remote_host, remote_port,
                local_host, local_port
            )
            
            logger.success(f"✅ SSH tunnel established via Tailscale!")
            logger.info(f"   Local:  localhost:{local_port}")
            logger.info(f"   Remote: {host}:{remote_port}")
            
            # Keep running
            await asyncio.Future()
            
    except Exception as e:
        logger.error(f"Failed to create SSH tunnel: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_tunnel())
```

---

## HTTP Wrapper Server (Python)

O OpenCode tem SDK apenas para **JS/TS**. Para Python, usamos **HTTP REST** diretamente.

### Seleção Explícita de Agentes

O ponto **CRÍTICO** é que o agente é selecionado **EXPLICITAMENTE** no body do prompt:

```python
# Quando enviamos um prompt, definimos o agente no body:
body = {
    "parts": [{"type": "text", "text": message}],
    "agent": "finances-orchestrator"  # ← SELEÇÃO EXPLÍCITA!
}
```

Isso garante que o OpenCode use o agente correto, não o default.

### Agentes Disponíveis (no oh-my-opencode)

| Agente | Descrição |
|--------|-----------|
| `finances-orchestrator` | Orquestrador principal de finanças |
| `wallet-agent` | Transações, saldos, despesas |
| `budget-analyst` | Orçamento, forecasting, KPIs |
| `investment-agent` | Portfólio, investimentos |
| `tax-specialist-br` | Impostos brasileiros (IRPF) |
| `regulatory-agent` | Regulamentações (CVM, BCB) |

### Arquitetura

```
┌─────────────────────┐      HTTP REST       ┌─────────────────────┐
│  Telegram Repo      │◄─────────────────────│  Wrapper Server     │
│  (Python)           │                      │  (MacBook :5147)    │
│                     │                      │                     │
│  Session Manager    │──── POST /session ──►│  FastAPI Server    │
│  • start_session    │◄── JSON Response ───│                     │
│  • continue_session │                      │  ┌───────────────┐  │
│  • send_audio       │                      │  │ OpenCode CLI  │  │
│  • send_image       │                      │  │ (porta 4096)  │  │
│                     │                      │  └───────────────┘  │
└─────────────────────┘                      └─────────────────────┘
                                                     │
                                                     │ HTTP
                                                     ▼
                                           ┌─────────────────────┐
                                           │  OpenCode Server    │
                                           │  (localhost:4096)   │
                                           │                     │
                                           │  - Session mgmt    │
                                           │  - Agents          │
                                           │  - Tools           │
                                           └─────────────────────┘
```

### wrapper_server.py

```python
#!/usr/bin/env python3
"""
Wrapper HTTP Server for OpenCode Finances Agents

Roda no MacBook e expõe uma API REST para o Telegram Repo.
Conecta-se ao OpenCode Server via HTTP na porta 4096.

O OpenCode SDK é JS/TS, então usamos HTTP REST diretamente.

Usage:
    python wrapper_server.py

Endpoints:
    POST /session/start     - Iniciar nova sessão
    POST /session/<id>/continue - Continuar sessão
    GET  /agents            - Listar agentes disponíveis
    GET  /health            - Health check
    POST /session/<id>/audio - Enviar áudio
    POST /session/<id>/image - Enviar imagem

Documentação OpenCode SDK:
https://opencode.ai/docs/sdk/
"""

import asyncio
import json
import uuid
import httpx
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# ============================================================
# Configuração
# ============================================================

OPENCODE_HOST = "127.0.0.1"  # OpenCode server no mesmo MacBook
OPENCODE_PORT = 4096         # Porta padrão do OpenCode
WRAPPER_PORT = 5147          # Porta do nosso wrapper

app = FastAPI(
    title="OpenCode Finances API",
    description="API REST para agentes de finanças do OpenCode",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Modelos de Dados
# ============================================================

class SessionStartRequest(BaseModel):
    message: str
    chat_id: int
    agent: str = "finances-orchestrator"
    model: str = "google/gemini-3-pro-preview"

class SessionContinueRequest(BaseModel):
    message: str

class AgentInfo(BaseModel):
    id: str
    name: str
    description: str

# ============================================================
# OpenCode HTTP Client
# ============================================================

class OpenCodeClient:
    """Cliente HTTP para se comunicar com o servidor OpenCode"""
    
    def __init__(self, host: str = OPENCODE_HOST, port: int = OPENCODE_PORT):
        self.base_url = f"http://{host}:{port}"
        self.http = httpx.AsyncClient(timeout=300.0)
    
    async def health(self) -> Dict[str, Any]:
        """Check server health"""
        try:
            r = await self.http.get(f"{self.base_url}/global.health")
            return r.json()
        except Exception as e:
            return {"healthy": False, "error": str(e)}
    
    async def list_agents(self) -> List[Dict[str, Any]]:
        """Listar todos os agentes disponíveis"""
        try:
            r = await self.http.get(f"{self.base_url}/app.agents")
            return r.json().get("data", [])
        except Exception as e:
            print(f"Erro ao listar agentes: {e}")
            return []
    
    async def create_session(self, title: str = "Finances Session") -> Dict[str, Any]:
        """Criar nova sessão"""
        try:
            r = await self.http.post(
                f"{self.base_url}/session.create",
                json={"title": title}
            )
            return r.json().get("data", {})
        except Exception as e:
            print(f"Erro ao criar sessão: {e}")
            raise
    
    async def send_prompt(
        self,
        session_id: str,
        message: str,
        model: Optional[str] = None,
        agent: Optional[str] = None  # ← AGENTE EXPLICÍTAMENTE SELECIONADO
    ) -> Dict[str, Any]:
        """Enviar prompt para a sessão com seleção explícita de agente"""
        
        # Construir body com partes da mensagem
        body = {
            "parts": [{"type": "text", "text": message}]
        }
        
        # Adicionar model se especificado
        if model:
            # Mapear para provider/model ID do OpenCode
            model_map = {
                "google/gemini-3-pro-preview": {"providerID": "google", "modelID": "gemini-3-pro-preview"},
                "google/gemini-3-flash": {"providerID": "google", "modelID": "gemini-3-flash"},
                "google/gemini-1-5-pro": {"providerID": "google", "modelID": "gemini-1-5-pro"},
            }
            if model in model_map:
                body["model"] = model_map[model]
            else:
                body["model"] = {"providerID": "google", "modelID": model}
        
        # ← AGENTE SELECIONADO EXPLICITAMENTE
        if agent:
            body["agent"] = agent
        
        try:
            r = await self.http.post(
                f"{self.base_url}/session.prompt",
                json={"path": {"id": session_id}, "body": body}
            )
            return r.json()
        except Exception as e:
            print(f"Erro ao enviar prompt: {e}")
            raise
    
    async def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Obter mensagens da sessão"""
        try:
            r = await self.http.get(f"{self.base_url}/session.messages", params={"path": {"id": session_id}})
            return r.json().get("data", {}).get("messages", [])
        except Exception as e:
            print(f"Erro ao obter mensagens: {e}")
            return []
    
    async def close_session(self, session_id: str) -> bool:
        """Fechar sessão"""
        try:
            r = await self.http.delete(f"{self.base_url}/session.delete", params={"path": {"id": session_id}})
            return r.status_code == 200
        except Exception as e:
            print(f"Erro ao fechar sessão: {e}")
            return False
    
    async def abort_session(self, session_id: str) -> bool:
        """Abortar sessão em execução"""
        try:
            r = await self.http.post(f"{self.base_url}/session.abort", json={"path": {"id": session_id}})
            return r.status_code == 200
        except Exception as e:
            print(f"Erro ao abortar sessão: {e}")
            return False

# Cliente OpenCode global
opencode_client = OpenCodeClient()

# ============================================================
# Armazenamento de Sessões (em memória)
# ============================================================

@dataclass
class FinanceSession:
    session_id: str
    opencode_session_id: str  # ID da sessão no OpenCode
    chat_id: int
    user_message: str
    agent_response: str
    agent_name: str
    model: str
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

sessions: Dict[str, FinanceSession] = {}

# ============================================================
# Endpoints da API
# ============================================================

@app.get("/health")
async def health_check():
    """Health check do wrapper e do OpenCode"""
    opencode_health = await opencode_client.health()
    return {
        "wrapper": "healthy",
        "wrapper_version": "1.0.0",
        "opencode": opencode_health
    }

@app.get("/agents", response_model=List[AgentInfo])
async def list_agents():
    """Listar todos os agentes disponíveis no OpenCode"""
    agents = await opencode_client.list_agents()
    return [
        AgentInfo(
            id=a.get("id", ""),
            name=a.get("name", ""),
            description=a.get("description", "")
        )
        for a in agents
    ]

@app.post("/session/start")
async def start_session(request: SessionStartRequest):
    """
    Iniciar nova sessão com o Finances Orchestrator agent.
    
    O agente é SELECIONADO EXPLICITAMENTE no body do prompt.
    
    Fluxo:
    1. Criar sessão no OpenCode (sem agente ainda)
    2. Enviar prompt com agent explícito no body
    3. Obter resposta do agente selecionado
    
    Args:
        request: message, chat_id, agent (default: finances-orchestrator), model
    
    Returns:
        session_id, opencode_session_id, e response inicial
    """
    session_id = str(uuid.uuid4())
    
    try:
        # 1. Criar sessão no OpenCode
        opencode_session = await opencode_client.create_session(
            title=f"[{request.agent}] Chat {request.chat_id}"
        )
        opencode_session_id = opencode_session.get("id")
        
        if not opencode_session_id:
            raise HTTPException(status_code=500, detail="Falha ao criar sessão no OpenCode")
        
        # 2. Enviar prompt INICIAL com agente SELECIONADO EXPLICITAMENTE
        result = await opencode_client.send_prompt(
            session_id=opencode_session_id,
            message=request.message,
            model=request.model,
            agent=request.agent  # ← AGENTE SELECIONADO!
        )
        
        # 3. Obter resposta
        messages = await opencode_client.get_messages(opencode_session_id)
        
        # Extrair última mensagem do assistente
        assistant_response = ""
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                parts = msg.get("parts", [])
                assistant_response = " ".join(p.get("text", "") for p in parts)
                break
        
        # 4. Salvar sessão
        session = FinanceSession(
            session_id=session_id,
            opencode_session_id=opencode_session_id,
            chat_id=request.chat_id,
            user_message=request.message,
            agent_response=assistant_response,
            agent_name=request.agent,
            model=request.model
        )
        sessions[session_id] = session
        
        return {
            "session_id": session_id,
            "opencode_session_id": opencode_session_id,
            "status": "completed",
            "response": assistant_response,
            "agent": request.agent,
            "model": request.model,
            "started_at": session.started_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/{session_id}/continue")
async def continue_session(session_id: str, request: SessionContinueRequest):
    """
    Continuar uma sessão existente.
    
    Usa o mesmo agente da sessão original.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session = sessions[session_id]
    
    try:
        # Enviar nova mensagem com o MESMO agente
        full_message = f"{session.user_message}\n\n---\n\n{request.message}"
        
        result = await opencode_client.send_prompt(
            session_id=session.opencode_session_id,
            message=request.message,
            model=session.model,
            agent=session.agent_name  # ← USA O MESMO AGENTE!
        )
        
        # Obter respostas
        messages = await opencode_client.get_messages(session.opencode_session_id)
        
        # Extrair nova resposta
        new_response = ""
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                parts = msg.get("parts", [])
                new_response = " ".join(p.get("text", "") for p in parts)
                break
        
        # Atualizar sessão
        session.user_message = full_message
        session.agent_response = new_response
        session.completed_at = datetime.now()
        
        return {
            "session_id": session_id,
            "status": "completed",
            "response": new_response,
            "started_at": session.started_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/{session_id}/audio")
async def send_audio(session_id: str, file: UploadFile = File(...)):
    """
    Enviar áudio para análise.
    
    O áudio é enviado para o OpenCode que pode processá-lo
    se tiver suporte a multimodal.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session = sessions[session_id]
    
    # Ler conteúdo do áudio
    audio_content = await file.read()
    
    # Stub: Em implementação real, enviar áudio para processamento
    # O OpenCode 1.5 Pro suporta áudio multimodal
    
    return {
        "session_id": session_id,
        "status": "processing",
        "message": "Áudio recebido. Processamento via Gemini 1.5 Pro (multimodal).",
        "filename": file.filename,
        "content_type": file.content_type
    }

@app.post("/session/{session_id}/image")
async def send_image(session_id: str, file: UploadFile = File(...)):
    """
    Enviar imagem para análise (ex: recibos, extratos).
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session = sessions[session_id]
    
    image_content = await file.read()
    
    return {
        "session_id": session_id,
        "status": "processing",
        "message": "Imagem recebida. Análise via Gemini 1.5 Pro (multimodal).",
        "filename": file.filename,
        "content_type": file.content_type
    }

@app.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Obter status de uma sessão."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session = sessions[session_id]
    
    return {
        "session_id": session_id,
        "opencode_session_id": session.opencode_session_id,
        "chat_id": session.chat_id,
        "agent": session.agent_name,
        "model": session.model,
        "status": "completed" if session.completed_at else "running",
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None
    }

@app.get("/sessions")
async def list_sessions(chat_id: Optional[int] = None):
    """Listar todas as sessões."""
    result = []
    for sid, session in sessions.items():
        if chat_id is None or session.chat_id == chat_id:
            result.append({
                "session_id": sid,
                "opencode_session_id": session.opencode_session_id,
                "chat_id": session.chat_id,
                "agent": session.agent_name,
                "started_at": session.started_at.isoformat(),
                "status": "completed" if session.completed_at else "running"
            })
    return {"sessions": result}

@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Fechar e deletar uma sessão."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session = sessions[session_id]
    
    # Fechar sessão no OpenCode
    await opencode_client.close_session(session.opencode_session_id)
    
    # Remover da memória
    del sessions[session_id]
    
    return {"status": "deleted", "session_id": session_id}

# ============================================================
# Executar Servidor
# ============================================================

if __name__ == "__main__":
    print(f"""
🚀 OpenCode Finances API Server
   ====================================
   📡 Wrapper Server: http://0.0.0.0:{WRAPPER_PORT}
   🔗 OpenCode Server: http://{OPENCODE_HOST}:{OPENCODE_PORT}
   📋 Endpoints:
      - POST /session/start
      - POST /session/<id>/continue
      - POST /session/<id>/audio
      - POST /session/<id>/image
      - GET  /session/<id>/status
      - GET  /agents (lista agentes disponíveis)
      - GET  /health
   ====================================
   
   ⚠️  Pré-requisitos:
   1. OpenCode deve estar rodando em localhost:4096
   2. Execute: opencode --port {OPENCODE_PORT}
   3. Ou: opencode (usa porta padrão 4096)
   ====================================
    """)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=WRAPPER_PORT,
        log_level="info"
    )
```

### requirements.txt (atualizado)

```txt
# Core
fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.5.0
python-multipart>=0.0.6
httpx>=0.25.0
loguru>=0.7.0
```

### Como Executar

```bash
# No seu MacBook

# 1. Instalar dependências
pip install fastapi uvicorn pydantic python-multipart httpx

# 2. Iniciar o OpenCode (em outro terminal)
opencode --port 4096
# Ou simplesmente: opencode

# 3. Executar o wrapper server (neste terminal)
python wrapper_server.py

# Output esperado:
# 🚀 OpenCode Finances API Server
#    📡 Wrapper Server: http://0.0.0.0:5147
#    🔗 OpenCode Server: http://127.0.0.1:4096
```

### Verificar Agentes Disponíveis

```bash
# Listar agentes do OpenCode
curl http://localhost:5147/agents

# Response:
# [
#   {"id": "Sisyphus", "name": "Sisyphus", "description": "..."},
#   {"id": "finances-orchestrator", "name": "finances-orchestrator", "description": "..."},
#   {"id": "wallet-agent", "name": "wallet-agent", "description": "..."},
#   ...
# ]
```

### Exemplo Completo de Requisição

```bash
# 1. Iniciar sessão com finances-orchestrator
curl -X POST http://localhost:5147/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analise meu portfólio de investimentos",
    "chat_id": 123456789,
    "agent": "finances-orchestrator",
    "model": "google/gemini-3-pro-preview"
  }'

# Response:
# {
#   "session_id": "abc123-def456",
#   "opencode_session_id": "xyz789",
#   "status": "completed",
#   "response": "📊 Análise do seu portfólio...",
#   "agent": "finances-orchestrator",
#   "model": "google/gemini-3-pro-preview",
#   "started_at": "2026-01-16T15:30:00Z"
# }

# 2. Continuar a mesma sessão
curl -X POST http://localhost:5147/session/abc123-def456/continue \
  -H "Content-Type: application/json" \
  -d '{"message": "E para o próximo trimestre?"}'

# Response:
# {
#   "session_id": "abc123-def456",
#   "status": "completed",
#   "response": "📈 Projeção para Q1...",
#   "started_at": "2026-01-16T15:30:00Z"
# }
```

### Resumo do Fluxo de Seleção de Agente

```
1. Telegram Repo envia:
   POST /session/start { agent: "finances-orchestrator" }

2. Wrapper Server recebe e extrai o agente do request

3. Wrapper Server envia para OpenCode:
   POST /session.prompt
   {
     "path": { "id": "session_id" },
     "body": {
       "parts": [{ "type": "text", "text": "mensagem" }],
       "agent": "finances-orchestrator"  ← SELEÇÃO EXPLÍCITA!
     }
   }

4. OpenCode executa o agente especificado

5. Wrapper Server retorna resposta para Telegram
```

### Session Logs

```markdown
# logs/sessions/2024-01-15-session-abc123.md

---
session_id: abc123
user_id: 123456789
started_at: 2024-01-15T10:30:00Z
completed_at: 2024-01-15T10:35:00Z
model: google/gemini-3-pro-preview
---

## Resumo da Sessão

Análise de investimento do portfólio de janeiro.

## Mensagens

### Usuário
Analise meu portfólio de investimentos

### Bot
[Response...]

## Resultados

- Análise gerada
- Documento salvo: docs/investments/2024-01-15-analysis.md
```

### Daily Summaries

```markdown
# logs/daily/2024-01-15-summary.md

---
date: 2024-01-15
total_sessions: 5
total_messages: 23
---

## Resumo Diário

### Sessões Ativas
1. abc123 - Análise de investimento
2. def456 - Revisão de orçamento
3. ghi789 - Consulta de saldo

### Métricas
- Total de mensagens: 23
- Sessões concluídas: 3
- Sessões ativas: 2

### Observações
- Usuário perguntou sobre FIIs pela primeira vez
- Sessão de análise de investimento foi a mais longa (5 minutos)
```

---

## Development Commands

```makefile
# Makefile

.PHONY: run test lint format clean setup

setup:
	python -m venv venv
	. venv/bin/activate && pip install -r requirements.txt

run:
	. venv/bin/activate && python src/bot.py

test:
	. venv/bin/activate && pytest tests/ -v

lint:
	. venv/bin/activate && ruff check src/

format:
	. venv/bin/activate && ruff check src/ --fix

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf venv/
```

---

## Webhook Integration (For Production)

If deploying to production (not local), you'll need a webhook:

```python
# src/webhook_handler.py

from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import httpx
from config import config

app = FastAPI()

class WebhookPayload(BaseModel):
    session_id: str
    summary: str
    document_path: Optional[str] = None
    agent_results: list = []

@app.post("/webhook/session-complete")
async def session_complete(payload: WebhookPayload, request: Request):
    """Receive session completion from OpenCode"""
    
    # Verify request (add your verification method)
    # if not verify_request(request):
    #     raise HTTPException(status_code=401, detail="Unauthorized")
    
    # TODO: Send summary to Telegram user
    # This requires storing chat_id -> session_id mapping
    
    return {"status": "received"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

---

## Troubleshooting

### Tailscale SSH Issues

```bash
# Check if Tailscale is running on MacBook
tailscale status

# Get your Tailscale IP
tailscale ip

# Test SSH connection via Tailscale
ssh -v your_username@100.x.x.x

# Verify SSH is enabled on MacBook
# System Settings → Sharing → "Remote Login" should be checked

# Check port is listening
netstat -tulpn | grep 5147

# Test SSH key authentication
ssh -i ~/.ssh/id_ed25519 -p 22 your_username@100.x.x.x
```

### Bot Not Responding

1. Check bot token is correct
2. Verify Tailscale connection is working
3. Check logs for errors (`logs/sessions/`)
4. Verify OpenCode server is running on MacBook
5. Ensure SSH tunnel is established

### Session Timeout

```python
# Increase timeout in config.yaml
opencode:
  timeout: 600  # 10 minutes
```

### Tailscale-specific Issues

```bash
# Tailscale not showing other devices?
tailscale netcheck

# Force Tailscale to reconnect
sudo tailscale down && sudo tailscale up

# Check Tailscale logs
tail -f /var/log/tailscale.log
```

---

## Security Notes

⚠️ **Development Mode with Tailscale**

Tailscale provides WireGuard-based encryption (NSA-grade security), making it safe for development. However:

- Store Telegram bot token in environment variables, not config.yaml
- Keep SSH private key secure (600 permissions)
- Add Telegram webhook verification for production
- Consider using HTTPS for webhook endpoints in production

For production deployment:
- Use SSH key authentication (already configured)
- Add webhook verification
- Use HTTPS for all endpoints
- Store secrets in a secrets manager

---

## Related Documentation

- **Finances Agent Extension**: [finances-agent-extension.md](./finances-agent-extension.md)
- **Oh-My-OpenCode Main Documentation**: [AGENTS.md](../AGENTS.md)
- **Supabase Documentation**: https://supabase.com/docs
- **Python Telegram Bot**: https://python-telegram-bot.org
- **Tailscale Documentation**: https://tailscale.com/kb
