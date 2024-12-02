# Base Image
FROM node:14-alpine

WORKDIR /usr/app
# install dependencies
COPY ./package.json ./
RUN npm install
COPY ./ ./

EXPOSE 9000

# Default command
CMD ["npm", "start"]