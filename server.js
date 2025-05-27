const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://pipslf:aCJU0wYctkCkz4k@cluster0.4qf3sik.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function connectDb() {
  try {
    await client.connect();
    console.log("✅ Tengdur við MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Gat ekki tengst MongoDB:", err.message);
  }
}
connectDb();

const db = client.db("stealthpay");
const users = db.collection("users");

const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 465,
  secure: true,
  auth: {
    user: "billing@stealthpay.pro",
    pass: "aCJU0wYctkCkz4k"
  }
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Vantar nafn, email eða lykilorð" });
  }

  const existing = await users.findOne({ email });
  if (existing) {
    return res.status(400).json({ error: "Netfang þegar skráð" });
  }

  const walletId = "burneWallet_" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const user = { name, email, password, walletId, balance: 0 };
  await users.insertOne(user);

  try {
    await transporter.sendMail({
      from: '"StealthPay" <billing@stealthpay.pro>',
      to: email,
      subject: "Skráning tókst",
      text: `Sæll ${name},\n\nVeskið þitt er ${walletId}`
    });
    console.log("📧 Email sent to:", email);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }

  res.json({ walletId, name, email });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await users.findOne({ email, password });

  if (!user) {
    return res.status(401).json({ error: "Rangt netfang eða lykilorð" });
  }

  const { name, walletId, balance } = user;
  res.json({ name, email, walletId, balance });
});

app.post("/send", async (req, res) => {
  const { from, to, amount } = req.body;
  const sender = await users.findOne({ walletId: from });
  const recipient = await users.findOne({ walletId: to });

  if (!sender || !recipient) {
    return res.status(404).json({ error: "Veski fannst ekki" });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ error: "Ekki næg inneign" });
  }

  await users.updateOne({ walletId: from }, { $inc: { balance: -amount } });
  await users.updateOne({ walletId: to }, { $inc: { balance: amount } });

  res.json({ success: true });
});

app.get("/wallet/:id", async (req, res) => {
  const wallet = await users.findOne({ walletId: req.params.id });

  if (!wallet) {
    return res.status(404).json({ error: "Veski fannst ekki" });
  }

  res.json({ name: wallet.name, email: wallet.email, balance: wallet.balance });
});

app.get("/", (req, res) => {
  res.send("✅ StealthPay backend virkar!");
});

app.listen(3000, () => {
  console.log("🚀 StealthPay keyrir á port 3000");
});
