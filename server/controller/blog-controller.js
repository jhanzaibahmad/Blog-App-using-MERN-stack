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
    const result = await docClient.send(new ScanCommand(params));
    return res.status(200).json({ blogs: result.Items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching blogs" });
  }
};

// Add a new blog
const addBlog = async (req, res) => {
  const { title, desc, img, user } = req.body;
  console.log("Received data:", req.body);
  const currentDate = new Date().toISOString();
  const blogId = uuidv4(); // Generate a unique blogId

  // Step 1: Check if the user exists
  const userParams = {
    TableName: USERS_TABLE,
    Key: { email: user }, // User email is the primary key
  };

  let existingUser;
  try {
    const userResult = await docClient.send(new GetCommand(userParams));
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
    blogId,            // Partition key for Blogs table
    user,         // For the GSI to query blogs by user
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
    await docClient.send(new PutCommand(blogParams));
  } catch (error) {
    console.error("Error creating blog:", error);
    return res.status(500).json({ message: "Error creating blog" });
  }

  // Step 3: Update user's blogs list (manual relationship handling)
  const userUpdateParams = {
    TableName: USERS_TABLE,
    Key: { email: user },
    UpdateExpression: "SET blogs = list_append(if_not_exists(blogs, :empty_list), :newBlog)",
    ExpressionAttributeValues: {
      ":newBlog": [blogId],
      ":empty_list": []
    },
  };

  try {
    await docClient.send(new UpdateCommand(userUpdateParams));
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
    Key: { blogId }, // blogId is the partition key
  };

  try {
    const result = await docClient.send(new GetCommand(params));
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

  // Step 1: Fetch the blog to get userEmail
  const blogParams = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
  };

  let blog;
  try {
    const result = await docClient.send(new GetCommand(blogParams));
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
    await docClient.send(new DeleteCommand(deleteParams));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting blog" });
  }

  // Step 3: Remove the blog from the user's blogs list
  // First get the user to get the current blogs array
  const getUserParams = {
    TableName: USERS_TABLE,
    Key: { email: blog.userEmail },
  };

  try {
    const userResult = await docClient.send(new GetCommand(getUserParams));
    const user = userResult.Item;
    
    if (user && user.blogs) {
      // Filter out the deleted blog ID
      const updatedBlogs = user.blogs.filter(id => id !== blogId);
      
      // Update the user with the new blogs array
      const userUpdateParams = {
        TableName: USERS_TABLE,
        Key: { email: blog.userEmail },
        UpdateExpression: "SET blogs = :updatedBlogs",
        ExpressionAttributeValues: {
          ":updatedBlogs": updatedBlogs
        }
      };
      
      await docClient.send(new UpdateCommand(userUpdateParams));
    }
  } catch (error) {
    console.error("Error updating user's blog list:", error);
    // We'll still return success since the blog was deleted
  }

  return res.status(200).json({ message: "Successfully deleted" });
};

// Update a blog
const updateBlog = async (req, res) => {
  const blogId = req.params.id;
  const { title, desc, img } = req.body;

  // Build update expression dynamically based on what fields are provided
  let updateExpression = "SET ";
  const expressionAttributeValues = {};
  
  if (title) {
    updateExpression += "title = :title, ";
    expressionAttributeValues[":title"] = title;
  }
  
  if (desc) {
    updateExpression += "desc = :desc, ";
    expressionAttributeValues[":desc"] = desc;
  }
  
  if (img) {
    updateExpression += "img = :img, ";
    expressionAttributeValues[":img"] = img;
  }
  
  // Remove trailing comma and space
  updateExpression = updateExpression.slice(0, -2);

  const params = {
    TableName: BLOGS_TABLE,
    Key: { blogId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await docClient.send(new UpdateCommand(params));
    return res.status(200).json({ blog: result.Attributes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating blog" });
  }
};

// Fetch blogs by user email
const getByUserId = async (req, res) => {
  const userId = req.params.id;

  // First, find the user by userId using the GSI
  const userParams = {
    TableName: USERS_TABLE,
    IndexName: "UserIdIndex",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  try {
    const userResult = await docClient.send(new QueryCommand(userParams));
    
    if (!userResult.Items || userResult.Items.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = userResult.Items[0];
    
    // Now query blogs by userEmail using the GSI
    const blogParams = {
      TableName: BLOGS_TABLE,
      IndexName: "UserBlogsIndex",
      KeyConditionExpression: "userEmail = :userEmail",
      ExpressionAttributeValues: {
        ":userEmail": user.email,
      },
    };
    
    const blogResult = await docClient.send(new QueryCommand(blogParams));
    
    return res.status(200).json({ 
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email
      },
      blogs: blogResult.Items || []
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching blogs for this user" });
  }
};

module.exports = { getAllBlogs, addBlog, updateBlog, getById, deleteBlog, getByUserId };