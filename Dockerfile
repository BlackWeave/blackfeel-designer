# Use Node.js as the base image
FROM node:20-slim

# Install system dependencies for Python and Image processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Create the python virtual environment where the service expects it
RUN mkdir -p backend/python-ai
RUN python3 -m venv backend/python-ai/venv

# Install Python dependencies in the virtual environment
# Based on enhance_script2.py imports
RUN ./backend/python-ai/venv/bin/pip install --no-cache-dir \
    requests \
    Pillow \
    python-dotenv \
    fal-client \
    rembg

# Copy the rest of the application code
COPY . .

# Ensure the .env file is present (as requested, though Cloud Run usually uses env vars)
# Note: If .env is in .dockerignore, it won't be copied. 
# We will create a .dockerignore that specifically allows .env

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]
