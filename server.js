import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Verify Token middleware
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid token" });
  }
}

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name, email, password: hash },
    });

    res.json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful ", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Create slot
app.post("/slot", verifyToken, async (req, res) => {
  try {
    const { date, time } = req.body;

    const slot = await prisma.slot.create({
      data: {
        date,
        time,
        userId: req.user.id,
        status: "BUSY",
      },
    });

    res.json(slot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating slot" });
  }
});

// Get my slots
app.get("/slots", verifyToken, async (req, res) => {
  const slots = await prisma.slot.findMany({
    where: { userId: req.user.id },
  });
  res.json(slots);
});

// Delete slot
app.delete("/slot/:id", verifyToken, async (req, res) => {
  const slot = await prisma.slot.findUnique({
    where: { id: parseInt(req.params.id) },
  });

  if (!slot || slot.userId !== req.user.id)
    return res.status(403).json({ error: "Not allowed" });

  await prisma.slot.delete({ where: { id: slot.id } });

  res.json({ message: "Slot deleted " });
});

// Make slot swappable
app.put("/slot/make-swappable/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  await prisma.slot.update({
    where: { id: parseInt(id) },
    data: { status: "SWAPPABLE" },
  });

  res.json({ message: "Slot marked swappable " });
});

// Get swappable slots from other users
app.get("/swappable-slots", verifyToken, async (req, res) => {
  const slots = await prisma.slot.findMany({
    where: {
      status: "SWAPPABLE",
      userId: { not: req.user.id },
    },
    include: { user: true },
  });

  res.json(slots);
});

// Send swap request
app.post("/swap-request", verifyToken, async (req, res) => {
  console.log(">>> /swap-request");
  console.log("Body:", req.body, "User:", req.user);

  const { mySlotId, theirSlotId, receiverId } = req.body;

  // validate ownership
  const mySlot = await prisma.slot.findUnique({ where: { id: mySlotId } });
  if (!mySlot || mySlot.userId !== req.user.id)
    return res.status(403).json({ error: "Not your slot" });

  const theirSlot = await prisma.slot.findUnique({
    where: { id: theirSlotId },
  });
  if (!theirSlot) return res.status(404).json({ error: "Other slot missing" });

  // create request
  const request = await prisma.swapRequest.create({
    data: {
      requesterId: req.user.id,
      receiverId,
      mySlotId,
      theirSlotId,
      status: "PENDING",
    },
  });

  await prisma.slot.updateMany({
    where: { id: { in: [mySlotId, theirSlotId] } },
    data: { status: "SWAP_PENDING" },
  });

  res.json({ message: "Swap request sent", request });
});

// Incoming swap requests list
app.get("/incoming-requests", verifyToken, async (req, res) => {
  const reqs = await prisma.swapRequest.findMany({
    where: { receiverId: req.user.id, status: "PENDING" },
    include: { requester: true },
  });

  res.json(reqs);
});

// Accept / Reject swap
app.post("/swap-response", verifyToken, async (req, res) => {
  const { requestId, accept } = req.body;

  const request = await prisma.swapRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return res.status(404).json({ error: "Not found" });

  if (!accept) {
    await prisma.slot.updateMany({
      where: { id: { in: [request.mySlotId, request.theirSlotId] } },
      data: { status: "SWAPPABLE" },
    });

    await prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    return res.json({ message: "Swap rejected ❌" });
  }

  // Accept -> switch owners
  await prisma.slot.update({
    where: { id: request.mySlotId },
    data: { userId: request.receiverId, status: "BUSY" },
  });

  await prisma.slot.update({
    where: { id: request.theirSlotId },
    data: { userId: request.requesterId, status: "BUSY" },
  });

  await prisma.swapRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  res.json({ message: "Swap completed ✅" });
});

//  Run server
const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
