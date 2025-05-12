const { docClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand, UpdateCommand } = require('../config/db');
const { v4: uuidv4 } = require('uuid'); // For generating unique blogId

// Define table names
const BLOGS_TABLE = "Blogs";
const USERS_TABLE = "Users";

// Fetch all blogs
const getAllBlogs = async (req, res) => {
  try {
    const params = {
      TableName: BLOGS_TABLE,
    };
    const result = await docClient.send(new ScanCommand(params)); // Using ScanCommand
    return res.status(200).json({ blogs: result.Items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching blogs" });
  }
};

// Add a new blog
const addBlog = async (req, res) => {
  const { title, desc, img, userId } = req.body;
  const currentDate = new Date().toISOString();
  const blogId = uuidv4(); // Generate a unique blogId

  // Step 1: Check if the user exists
  const userParams = {
    TableName: USERS_TABLE,
    Key: { userId },
  };

  let existingUser;
  try {
    const userResult = await docClient.send(new GetCommand(userParams)); // Using GetCommand
    existingUser = userResult.Item;
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Error checking user" });
  }

  if (!existingUser) {
    return res.status(400).json({ message: "Unauthorized user" });
  }

  // Step 2: Add blog to Blogs table
  const blog = {
    blogId,
    userId,
    title,
    desc,
    img,
    date: currentDate,
  };

  const blogParams = {
    TableName: BLOGS_TABLE,
    Item: blog,
  };

  try {
    await docClient.send(new PutCommand(blogParams)); // Using PutCommand
  } catch (error) {
    console.error("Error creating blog:", error);
    return res.status(500).json({ message: "Error creating blog" });
  }

  // Step 3: Update user’s blogs list (manual relationship handling)
  const userUpdateParams = {
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: "SET #blogs = list_append(#blogs, :newBlog)",
    ExpressionAttributeNames: { "#blogs": "blogs" },
    ExpressionAttributeValues: {
      ":newBlog": [blogId],
    },
  };

  try {
    await docClient.send(new UpdateCommand(userUpdateParams)); // Using UpdateCommand
  } catch (error) {
    console.error("Error updating user's blog list:", error);
    return res.status(500).json({ message: "Error updating user" });
  }

  return res.status(200).json({ blog });
};

// Get a blog by ID
const getById = async (req, res) => {
  const blogId = req.params.id;

  const params = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
  };

  try {
    const result = await docClient.send(new GetCommand(params)); // Using GetCommand
    if (!result.Item) {
      return res.status(404).json({ message: "Blog not found" });
    }
    return res.status(200).json({ blog: result.Item });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching blog" });
  }
};

// Delete a blog by ID
const deleteBlog = async (req, res) => {
  const blogId = req.params.id;

  // Step 1: Fetch the blog to get userId
  const blogParams = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
  };

  let blog;
  try {
    const result = await docClient.send(new GetCommand(blogParams)); // Using GetCommand
    blog = result.Item;
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting blog" });
  }

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  // Step 2: Delete the blog from Blogs table
  const deleteParams = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
  };

  try {
    await docClient.send(new DeleteCommand(deleteParams)); // Using DeleteCommand
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting blog" });
  }

  // Step 3: Remove the blog from the user's blogs list
  const userUpdateParams = {
    TableName: USERS_TABLE,
    Key: { userId: blog.userId },
    UpdateExpression: "REMOVE #blogs[:blogIndex]",
    ExpressionAttributeNames: { "#blogs": "blogs" },
    ExpressionAttributeValues: {
      ":blogIndex": blogId,
    },
  };

  try {
    await docClient.send(new UpdateCommand(userUpdateParams)); // Using UpdateCommand
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating user" });
  }

  return res.status(200).json({ message: "Successfully deleted" });
};

// Update a blog
const updateBlog = async (req, res) => {
  const blogId = req.params.id;
  const { title, desc } = req.body;

  const params = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
    UpdateExpression: "set title = :title, desc = :desc",
    ExpressionAttributeValues: {
      ":title": title,
      ":desc": desc,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await docClient.send(new UpdateCommand(params)); // Using UpdateCommand
    return res.status(200).json({ blog: result.Attributes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating blog" });
  }
};

// Fetch blogs by userId
const getByUserId = async (req, res) => {
  const userId = req.params.id;  // Getting userId from URL parameter

  const params = {
    TableName: BLOGS_TABLE,
    KeyConditionExpression: "userId = :userId",  // Query blogs by userId
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  try {
    const result = await docClient.send(new QueryCommand(params)); // Using QueryCommand

    if (result.Items.length === 0) {
      return res.status(404).json({ message: "No blogs found for this user" });
    }

    return res.status(200).json({ blogs: result.Items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching blogs for this user" });
  }
};

module.exports = { getAllBlogs, addBlog, updateBlog, getById, deleteBlog, getByUserId };
