FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy runtime data and source
COPY data/ /app/data/
COPY exports/ /app/exports/
COPY scripts/ /app/scripts/
COPY validator.py /app/validator.py
COPY backend/app/ /app/app/
COPY backend/ /app/backend/

ENV PYTHONPATH=/app/backend:/app
ENV ENVIRONMENT=production
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
