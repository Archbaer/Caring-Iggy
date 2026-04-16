FROM node:20-alpine

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

EXPOSE 3000

# Dev server with hot reload
CMD ["npm", "run", "dev", "--", "--port", "3000"]
