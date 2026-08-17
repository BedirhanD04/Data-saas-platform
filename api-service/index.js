require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "datasaas",
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});

app.get("/", (req, res) => {
  res.json({ message: "API service is running" });
});

app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

app.post("/register", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash]
  );

  res.json(result.rows[0]);
});

app.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ id: user.id, email: user.email, token });
});

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

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
  const { filename, rows, columns } = req.body;

  const result = await pool.query(
    "INSERT INTO datasets (user_id, filename, rows, columns) VALUES ($1, $2, $3, $4) RETURNING *",
    [req.user.id, filename, rows, columns]
  );

  res.json(result.rows[0]);
});

app.get("/datasets", authenticate, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM datasets WHERE user_id = $1 ORDER BY uploaded_at DESC",
    [req.user.id]
  );
  res.json(result.rows);
});

app.delete("/datasets/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  await pool.query(
    "DELETE FROM datasets WHERE id = $1 AND user_id = $2",
    [id, req.user.id]
  );

  res.json({ success: true });
});

app.listen(4000, () => {
  console.log("API service listening on http://localhost:4000");
});