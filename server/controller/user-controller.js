const { docClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Define table name
const USERS_TABLE = "Users";

// Get all users (for debugging or admin purposes)
const getAllUser = async (req, res) => {
  try {
    const params = {
      TableName: USERS_TABLE,
    };
    const result = await docClient.send(new QueryCommand(params));
    // Remove passwords before sending user data
    const users = result.Items.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    return res.status(200).json({ users });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching users" });
  }
};

// Sign up a new user
const signUp = async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { email }
    };
    
    const userResult = await docClient.send(new GetCommand(params));
    if (userResult.Item) {
      return res.status(400).json({ message: "User already exists" });
    }
  } catch (err) {
    console.error('Error checking if user exists:', err);
    return res.status(500).json({ message: "Error checking user" });
  }

  // Hash password and create new user
  const hashedPassword = bcrypt.hashSync(password, 10);
  const userId = uuidv4(); // Generate unique ID for GSI

  const newUser = {
    email,        // Primary key
    userId,       // For the GSI
    name,
    password: hashedPassword,
    blogs: []     // Initialize empty blogs array
  };

  try {
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: newUser
    }));
    
    // Don't return password in response
    const { password, ...userWithoutPassword } = newUser;
    return res.status(201).json({ user: email });
  } catch (err) {
    console.error('Error signing up user:', err);
    return res.status(500).json({ message: "Error signing up user" });
  }
};

// Log in a user
const logIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get user by email (primary key)
    const params = {
      TableName: USERS_TABLE,
      Key: { email }
    };
    
    const userResult = await docClient.send(new GetCommand(params));
    const existingUser = userResult.Item;
    
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare passwords
    const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = existingUser;
    return res.status(200).json({ user: email });
  } catch (err) {
    console.error('Error logging in:', err);
    return res.status(500).json({ message: "Error logging in" });
  }
};

module.exports = { getAllUser, signUp, logIn };