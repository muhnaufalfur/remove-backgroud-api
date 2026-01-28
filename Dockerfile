FROM node:20-bookworm

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install gdown
RUN pip3 install --no-cache-dir gdown

# Install Node deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Download ONNX model
RUN mkdir -p /root/.u2net \
 && gdown https://drive.google.com/uc?id=1OjfstIZRm-3YNw6N6mtFsij6x9GgljQB \
    -O /root/.u2net/u2net.onnx

EXPOSE 3080
CMD ["npm", "start"]
