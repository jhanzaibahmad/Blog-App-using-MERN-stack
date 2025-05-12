const bcrypt = require("bcryptjs");
const { docClient, PutCommand, ScanCommand, QueryCommand } = require("../config/db"); // Import the updated docClient and commands

// Define table name
const USERS_TABLE = "Users";

// Get all users (if needed for debugging or some other functionality)
const getAllUser = async (req, res) => {
  try {
    const params = {
      TableName: USERS_TABLE,
    };
    const result = await docClient.send(new ScanCommand(params)); // Using ScanCommand instead of .scan()
    return res.status(200).json({ users: result.Items });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching users" });
  }
};

const signUp = async (req, res) => {
  const { name, email, password } = req.body;

  let existingUser;
  try {
    const params = {
      TableName: USERS_TABLE,
      IndexName: "EmailIndex", // Use the GSI for email
      KeyConditionExpression: "email = :email", // Query by email in the GSI
      ExpressionAttributeValues: {
        ":email": email,
      },
    };
    const userResult = await docClient.send(new QueryCommand(params)); // Using QueryCommand
    existingUser = userResult.Items && userResult.Items[0];
  } catch (err) {
    console.error('Error checking if user exists:', err);
    return res.status(500).json({ message: "Error checking user" });
  }

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password

  const newUser = {
    email,
    name,
    password: hashedPassword,
    blogs: [] // Initialize empty blogs list
  };

  const putParams = {
    TableName: USERS_TABLE,
    Item: newUser,
  };

  try {
    // Save the user to DynamoDB
    await docClient.send(new PutCommand(putParams)); // Using PutCommand to save the user
    return res.status(201).json({ user: newUser });
  } catch (err) {
    console.error('Error signing up user:', err);
    return res.status(500).json({ message: "Error signing up user" });
  }
};

// Log in a user
const logIn = async (req, res) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    // Retrieve the user by email
    const params = {
      TableName: USERS_TABLE,
      Key: { email },
    };
    const userResult = await docClient.send(new QueryCommand(params)); // Using QueryCommand
    existingUser = userResult.Items && userResult.Items[0];
  } catch (err) {
    console.error('Error retrieving user for login:', err);
    return res.status(500).json({ message: "Error checking user" });
  }

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  // Compare the provided password with the hashed password
  const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);

  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Incorrect password" });
  }

  return res.status(200).json({ user: existingUser });
};

module.exports = { getAllUser, signUp, logIn };
