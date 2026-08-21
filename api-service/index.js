require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
const isProd = process.env.NODE_ENV === "production";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://data-saas-platform.vercel.app",
    "https://data-saas-platform-git-main-bedirhan5.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
  ? false
  : {
      ca: process.env.DATABASE_CA_CERT,
      rejectUnauthorized: true,
      checkServerIdentity: () => undefined,
    },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many requests, please try again later." },
});

app.get("/", (req, res) => {
  res.json({ message: "API service is running" });
});

app.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ id: user.id, email: user.email,});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/me", authenticate, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

app.post("/datasets", authenticate, async (req, res) => {
  try {
    const { filename, rows, columns } = req.body;

    if (!filename || rows == null || !Array.isArray(columns)) {
      return res.status(400).json({ error: "Invalid dataset data" });
    }

    const result = await pool.query(
      "INSERT INTO datasets (user_id, filename, rows, columns) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, filename, rows, columns]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/datasets", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM datasets WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/datasets/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM datasets WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  });
  res.json({ success: true });
});

app.post("/analyze", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer]);
    formData.append("file", blob, req.file.originalname);

    const response = await fetch(`${process.env.DATA_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${req.cookies.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(4000, () => {
  console.log("API service listening on http://localhost:4000");
});