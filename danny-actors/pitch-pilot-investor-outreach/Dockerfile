FROM apify/actor-node:20

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --quiet --omit=dev

# Copy the rest of the application files
COPY . ./

# Run the code
CMD ["npm", "start"]
