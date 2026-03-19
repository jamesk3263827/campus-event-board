const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

// Public route
app.get("/", (req, res) => {
  res.json({ message: "Campus Event Board API is running" });
});

// Protected test route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "You are authenticated", userId: req.user.uid });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});