const express = require("express");
const blogRouter = express.Router();
const {
  getAllBlogs,
  addBlog,
  updateBlog,
  getById,
  deleteBlog,
  getByUserId
} = require("../controller/blog-controller");

// Route to fetch all blogs
blogRouter.get("/", getAllBlogs);

// Route to add a new blog
blogRouter.post("/add", addBlog);

// Route to update a blog by its ID
blogRouter.put("/update/:id", updateBlog);

// Route to get a blog by its ID
blogRouter.get("/:id", getById);

// Route to delete a blog by its ID
blogRouter.delete("/:id", deleteBlog);

// Route to get blogs by user ID (showing all blogs for a specific user)
blogRouter.get("/user/:id", getByUserId);

module.exports = blogRouter;
