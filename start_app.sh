#!/bin/bash

echo "[EasyGo Issue] Launcher"

# 1. Check for Portable Node.js in /bin (Optional for Linux/Mac, but good for consistency)
if [ -f "$(dirname "$0")/bin/node" ]; then
    echo "[INFO] Found portable Node.js in /bin"
    export PATH="$(dirname "$0")/bin:$PATH"
fi

# 2. Check if Node is available
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not found!"
    echo "1. Install Node.js from https://nodejs.org/"
    echo "2. OR download 'node' binary and place it in a 'bin' folder inside this project (Portable Mode)."
    exit 1
fi

# 3. Check if we need to install dependencies
if [ ! -d "$(dirname "$0")/node_modules" ]; then
    echo "[SETUP] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies."
        exit 1
    fi
else
    echo "[INFO] Dependencies already installed. Skipping npm install."
fi

# 4. Build Frontend (Skip if dist exists)
if [ -d "$(dirname "$0")/dist" ]; then
    echo "[INFO] Frontend build found. Skipping build..."
else
    echo "[SETUP] Building frontend (First time run)..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to build frontend."
        exit 1
    fi
fi

# 5. Run Server
echo ""
echo "[START] Running EasyGo Issue..."
echo ""

node server/index.js
