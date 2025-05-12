// Import necessary packages from AWS SDK v3
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDBClient
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,  // You can fetch this from your .env file
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create DynamoDB Document Client
const docClient = DynamoDBDocumentClient.from(client);

// Export the client for other modules to use
module.exports = {
  docClient,
  ScanCommand,
  PutCommand,
  QueryCommand,
};
