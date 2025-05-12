// Revised DynamoDB table creation script based on your controllers
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
require("dotenv").config();

// Initialize DynamoDB client
const dynamodb = new DynamoDB({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create Users table
const createUsersTable = async () => {
  const params = {
    TableName: "Users",
    KeySchema: [
      { AttributeName: "email", KeyType: "HASH" } // Email as partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    const result = await dynamodb.createTable(params);
    console.log("Users table created successfully:", result);
    return result;
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log("Users table already exists");
    } else {
      console.error("Error creating Users table:", error);
      throw error;
    }
  }
};

// Create Blogs table
const createBlogsTable = async () => {
  const params = {
    TableName: "Blogs",
    KeySchema: [
      { AttributeName: "blogId", KeyType: "HASH" } // blogId as partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "blogId", AttributeType: "S" },
      { AttributeName: "userEmail", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserBlogsIndex",
        KeySchema: [
          { AttributeName: "userEmail", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    const result = await dynamodb.createTable(params);
    console.log("Blogs table created successfully:", result);
    return result;
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log("Blogs table already exists");
    } else {
      console.error("Error creating Blogs table:", error);
      throw error;
    }
  }
};

// Function to create all tables
const createTables = async () => {
  try {
    console.log("Creating DynamoDB tables...");
    await createUsersTable();
    await createBlogsTable();
    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Failed to create tables:", error);
  }
};

// Execute the function if this script is run directly
if (require.main === module) {
  createTables();
}

// Export the functions for use in other scripts
module.exports = { createUsersTable, createBlogsTable, createTables };