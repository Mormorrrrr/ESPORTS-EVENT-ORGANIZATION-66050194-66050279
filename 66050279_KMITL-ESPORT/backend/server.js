import express from "express";
import cors from "cors";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

const { PrismaClient } = pkg;

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.get("/", (req, res) => {
  res.send("Express + Prisma API ทำงานแล้ว");
});

// =========================
// REGISTER USER
// =========================
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body; // Removed role from req.body

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: "กรอกข้อมูลไม่ครบ" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: "username นี้มีคนใช้แล้ว" });
    }

    let assignedRole = "User"; // Default role to User
    if (username === "admin29" && email === "admin@admin.com") {
      assignedRole = "Admin";
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password,
        role: assignedRole,
      },
    });

    res.json({
      message: "สมัครสมาชิกสำเร็จ",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "สมัครสมาชิกไม่สำเร็จ" });
  }
});

// =========================
// LOGIN USER
// =========================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: "กรอกข้อมูลไม่ครบ" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Username ไม่ถูกต้อง" });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Password ไม่ถูกต้อง" });
    }

    let redirectUrl = '../User/Tournament List Page 1/userlogin_1.html';
    if (user.role === 'Admin') {
      redirectUrl = '../Admin/Dashboard Page 8/Dashboard_8.html';
    }

    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      user,
      redirectUrl // Send redirectUrl to frontend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เข้าสู่ระบบไม่สำเร็จ" });
  }
});

// =========================
// GET USERS
// =========================
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูล user ไม่สำเร็จ" });
  }
});

// =========================
// CREATE TEAM
// =========================
app.post("/teams", async (req, res) => {
  const {
    team_name,
    team_banner_url,
    leader_name,
    member_1,
    member_2,
    member_3,
    member_4,
    created_by,
  } = req.body;

  try {
    if (!team_name || !leader_name || !created_by) {
      return res.status(400).json({ error: "ข้อมูลทีมไม่ครบ" });
    }

    const team = await prisma.team.create({
      data: {
        team_name,
        team_banner_url,
        leader_name,
        member_1,
        member_2,
        member_3,
        member_4,
        created_by,
      },
    });

    res.json({
      message: "สร้างทีมสำเร็จ",
      team,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "สร้างทีมไม่สำเร็จ" });
  }
});

// =========================
// GET TEAMS
// =========================
app.get("/teams", async (req, res) => {
  try {
    const teams = await prisma.team.findMany();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลทีมไม่สำเร็จ" });
  }
});

// =========================
// CREATE TOURNAMENT
// =========================
app.post("/tournaments", async (req, res) => {
  const { tournament_name, tournament_type, start_date, end_date } = req.body;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        tournament_name,
        tournament_type,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });

    res.json({
      message: "สร้าง Tournament สำเร็จ",
      tournament,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "สร้าง Tournament ไม่สำเร็จ" });
  }
});

// =========================
// GET TOURNAMENTS
// =========================
app.get("/tournaments", async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany();
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: "โหลด tournament ไม่ได้" });
  }
});

// =========================
// GET TOURNAMENT BY ID
// =========================
app.get("/tournaments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { tournament_id: id },
      include: {
        applications: {
          include: { team: true },
        },
      },
    });
    if (!tournament) {
      return res.status(404).json({ error: "ไม่พบ tournament" });
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: "โหลด tournament ไม่ได้" });
  }
});

// =========================
// APPLY TOURNAMENT
// =========================
app.post("/applications", async (req, res) => {
  const { tournament_type, team_id } = req.body;

  try {
    if (!tournament_type || !team_id) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }

    const tournament = await prisma.tournament.findFirst({
      where: {
        tournament_type: tournament_type,
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "ไม่พบ tournament" });
    }

    const application = await prisma.application.create({
      data: {
        tournament_id: tournament.tournament_id,
        team_id: team_id,
        status: "Pending",
      },
    });

    res.json({
      message: "สมัครแข่งขันสำเร็จ",
      application,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "สมัครแข่งขันไม่สำเร็จ" });
  }
});

// =========================
// GET APPLICATIONS
// =========================
app.get("/applications", async (req, res) => {
  try {
    const { tournament_id } = req.query;
    const where = tournament_id ? { tournament_id: parseInt(tournament_id) } : {};
    const applications = await prisma.application.findMany({
      where,
      include: {
        team: true,
        tournament: true,
      },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
  }
});

// =========================
// UPDATE APPLICATION STATUS
// =========================
app.patch("/applications/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  try {
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "status ไม่ถูกต้อง" });
    }
    const app = await prisma.application.update({
      where: { app_id: id },
      data: { status },
    });
    res.json({ message: "อัปเดต status สำเร็จ", app });
  } catch (error) {
    res.status(500).json({ error: "อัปเดต status ไม่สำเร็จ" });
  }
});

// =========================
// DELETE APPLICATION
// =========================
app.delete("/applications/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.application.delete({ where: { app_id: id } });
    res.json({ message: "ลบ application สำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: "ลบ application ไม่สำเร็จ" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
