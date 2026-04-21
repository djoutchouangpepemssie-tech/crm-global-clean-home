# Backend FastAPI — Railway
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Deps systeme minimales (compilation eventuelle de wheels, TLS)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps d'abord (cache Docker)
COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt

# Copie du code backend
COPY . .

# Railway injecte PORT a l'execution
ENV PORT=8000
EXPOSE 8000

# Start command (override-able par Railway via startCommand si besoin)
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT}
