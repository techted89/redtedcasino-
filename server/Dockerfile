# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Create and set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Your app binds to port 3000, so we expose it
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "src/server.js" ]
