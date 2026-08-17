FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Menghindari python menulis .pyc files & memastikan log langsung tercetak ke console
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (compiler untuk library tertentu jika diperlukan)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan install
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh file project backend ke container
COPY . /app/

# Expose port backend (sesuai uvicorn)
EXPOSE 8001

# Jalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
