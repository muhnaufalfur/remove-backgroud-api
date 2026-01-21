FROM node:20-bookworm

WORKDIR /app

# Allow SSL during install (Windows dev only)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package*.json ./

# Install deps (allow sharp binaries, still safe for onnx)
RUN npm install

COPY . .

EXPOSE 3080
CMD ["npm", "start"]
