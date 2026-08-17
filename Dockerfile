# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Production container for E-Commerce Product Search System
# Reference: TECH_STACK.md §6.1, DEVELOPMENT_PLAN.md §5.1
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production

WORKDIR /app

# Install curl for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download required NLTK data models (TECH_STACK.md §6.1)
RUN python -m nltk.downloader punkt stopwords punkt_tab

# Copy application source code and seed data
COPY . .

# Expose API port
EXPOSE 8000

# Run FastAPI via uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
