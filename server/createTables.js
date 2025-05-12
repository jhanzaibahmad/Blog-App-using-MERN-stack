const AWS = require("aws-sdk");
require('dotenv').config();

// Configure AWS SDK with your environment variables
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1" 
});

const dynamodb = new AWS.DynamoDB();

const createUsersTable = async () => {
    const params = {
        TableName: "Users",
        KeySchema: [
            { AttributeName: "userId", KeyType: "HASH" }, // Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: "userId", AttributeType: "S" },
            { AttributeName: "email", AttributeType: "S" }, // Add the email attribute
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        GlobalSecondaryIndexes: [
            {
                IndexName: "EmailIndex", // GSI name
                KeySchema: [
                    { AttributeName: "email", KeyType: "HASH" }, // Partition key for the GSI
                ],
                Projection: {
                    ProjectionType: "ALL", // Include all attributes in the index
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                },
            }
        ]
    };

    try {
        const data = await dynamodb.createTable(params).promise();
        console.log("Users Table Created with GSI on email:", data);
    } catch (err) {
        console.error("Error creating Users table:", err);
    }
};

// Create Blogs Table
const createBlogsTable = async () => {
    const params = {
        TableName: "Blogs",
        KeySchema: [
            { AttributeName: "blogId", KeyType: "HASH" }, // Partition key
            { AttributeName: "userId", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
            { AttributeName: "blogId", AttributeType: "S" },
            { AttributeName: "userId", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        const data = await dynamodb.createTable(params).promise();
        console.log("Blogs Table Created:", data);
    } catch (err) {
        console.error("Error creating Blogs table:", err);
    }
};

// Run the table creation functions
const createTables = async () => {
    await createUsersTable();
    //await createBlogsTable();
};

createTables();
