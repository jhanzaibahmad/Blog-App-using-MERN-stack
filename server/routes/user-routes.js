const express = require("express");
const { getAllUser, signUp, logIn } = require("../controller/user-controller");
const userRouter = express.Router();

// Route to fetch all users
userRouter.get("/", getAllUser);

// Route to sign up a new user
userRouter.post("/signup", signUp);

// Route to log in an existing user
userRouter.post("/login", logIn);

module.exports = userRouter;
