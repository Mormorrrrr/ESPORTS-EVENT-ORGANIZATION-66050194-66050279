import express from "express";
import cors from "cors";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PrismaClient } = pkg;

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.get("/api-health", (req, res) => {
  res.send("Express + Prisma API ทำงานแล้ว");
});

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/icons", express.static(path.join(__dirname, "../icons")));

// REGISTER USER

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

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

// LOGIN USER

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

// GET USERS

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูล user ไม่สำเร็จ" });
  }
});

// GET TEAMS

app.get("/teams", async (req, res) => {
  try {
    const teams = await prisma.team.findMany();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลทีมไม่ได้" });
  }
});

// CREATE TEAM

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

// GET TEAM BY ID

app.get("/teams/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const team = await prisma.team.findUnique({
      where: { team_id: parseInt(id) },
      include: {
        applications: {
          include: {
            tournament: true,
          },
        },
      },
    });
    if (!team) return res.status(404).json({ error: "ไม่พบทีม" });
    res.json({ team, applications: team.applications }); // For backward compatibility if needed
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลทีม" });
  }
});

// UPDATE TEAM

app.patch("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { team_name, team_banner_url, leader_name, member_1, member_2, member_3, member_4 } = req.body;
  
  try {
    const data = {};
    if (team_name) data.team_name = team_name;
    if (team_banner_url !== undefined) data.team_banner_url = team_banner_url;
    if (leader_name) data.leader_name = leader_name;
    if (member_1 !== undefined) data.member_1 = member_1;
    if (member_2 !== undefined) data.member_2 = member_2;
    if (member_3 !== undefined) data.member_3 = member_3;
    if (member_4 !== undefined) data.member_4 = member_4;

    const team = await prisma.team.update({
      where: { team_id: id },
      data,
    });
    res.json({ message: "อัปเดตทีมสำเร็จ", team });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "อัปเดตทีมไม่สำเร็จ" });
  }
});

// DELETE TEAM

app.delete("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Delete related applications first
    await prisma.application.deleteMany({
      where: { team_id: id }
    });

    await prisma.team.delete({
      where: { team_id: id },
    });
    res.json({ message: "ลบทีมสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "ลบทีมไม่สำเร็จ" });
  }
});

// CREATE TOURNAMENT

app.post("/tournaments", async (req, res) => {
  const { tournament_name, tournament_type, start_date, end_date, tournament_banner, age_min, age_max, duration, format } = req.body;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        tournament_name,
        tournament_type,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        tournament_banner,
        age_min: age_min ? parseInt(age_min) : null,
        age_max: age_max ? parseInt(age_max) : null,
        duration,
        format
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

// GET TOURNAMENTS

app.get("/tournaments", async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: "โหลด tournament ไม่ได้" });
  }
});

// GET TOURNAMENT BY ID

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

// UPDATE TOURNAMENT

app.put("/tournaments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { tournament_name, tournament_type, start_date, end_date, tournament_banner, age_min, age_max, duration, format } = req.body;

  try {
    const data = {};
    if (tournament_name) data.tournament_name = tournament_name;
    if (tournament_type) data.tournament_type = tournament_type;
    if (start_date) data.start_date = new Date(start_date);
    if (end_date) data.end_date = new Date(end_date);
    if (tournament_banner !== undefined) data.tournament_banner = tournament_banner;
    if (age_min !== undefined) data.age_min = age_min ? parseInt(age_min) : null;
    if (age_max !== undefined) data.age_max = age_max ? parseInt(age_max) : null;
    if (duration !== undefined) data.duration = duration;
    if (format !== undefined) data.format = format;

    const tournament = await prisma.tournament.update({
      where: { tournament_id: id },
      data,
    });
    res.json({ message: "อัปเดต Tournament สำเร็จ", tournament });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "อัปเดต Tournament ไม่สำเร็จ" });
  }
});

// DELETE TOURNAMENT

app.delete("/tournaments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Delete related applications first
    await prisma.application.deleteMany({
      where: { tournament_id: id },
    });
    // Delete related matches
    await prisma.match.deleteMany({
      where: { tournament_id: id },
    });
    await prisma.tournament.delete({
      where: { tournament_id: id },
    });
    res.json({ message: "ลบ Tournament สำเร็จ" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "ลบ Tournament ไม่สำเร็จ" });
  }
});

// GET MATCHES BY TOURNAMENT

app.get("/tournaments/:id/matches", async (req, res) => {
  const tournamentId = parseInt(req.params.id);
  try {
    const matches = await prisma.match.findMany({
      where: { tournament_id: tournamentId },
      orderBy: [{ round: 'asc' }, { position: 'asc' }]
    });
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "ดึงข้อมูลการแข่งขันไม่สำเร็จ" });
  }
});

// SAVE/UPDATE MATCHES FOR TOURNAMENT

app.post("/tournaments/:id/matches/save", async (req, res) => {
  const tournamentId = parseInt(req.params.id);
  const { matches } = req.body;

  try {
    await prisma.match.deleteMany({ where: { tournament_id: tournamentId } });
    if (matches && matches.length > 0) {
      await prisma.match.createMany({
        data: matches.map(m => ({
          tournament_id: tournamentId,
          team1_name: m.team1_name,
          team2_name: m.team2_name,
          score1: m.score1,
          score2: m.score2,
          round: m.round,
          position: m.position
        }))
      });
    }
    res.json({ message: "บันทึกข้อมูลการแข่งขันสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "บันทึกข้อมูลการแข่งขันไม่สำเร็จ" });
  }
});


// APPLY TOURNAMENT

app.post("/applications", async (req, res) => {
  const { tournament_id, tournament_type, team_id } = req.body;

  try {
    if (!team_id || (!tournament_id && !tournament_type)) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ (ต้องการ team_id และ tournament_id หรือ tournament_type)" });
    }

    let targetTournamentId = tournament_id;

    if (!targetTournamentId && tournament_type) {
      const tournament = await prisma.tournament.findFirst({
        where: {
          tournament_type: tournament_type,
        },
      });

      if (!tournament) {
        return res.status(404).json({ error: "ไม่พบ tournament จาก type ที่ระบุ" });
      }
      targetTournamentId = tournament.tournament_id;
    }

    const application = await prisma.application.create({
      data: {
        tournament_id: parseInt(targetTournamentId),
        team_id: parseInt(team_id),
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

// GET APPLICATIONS

app.get("/applications", async (req, res) => {
  try {
    const { tournament_id, team_id } = req.query;
    const where = {};
    if (tournament_id) where.tournament_id = parseInt(tournament_id);
    if (team_id) where.team_id = parseInt(team_id);

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

// UPDATE APPLICATION STATUS

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

// DELETE APPLICATION

app.delete("/applications/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.application.delete({ where: { app_id: id } });
    res.json({ message: "ลบ application สำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: "ลบ application ไม่สำเร็จ" });
  }
});

// Fallback to index.html for SPA behavior - Use a case-insensitive regex
app.get(/^(?!\/(tournaments|teams|applications|login|register|api-health)).*$/i, (req, res) => {
  // If request looks like a file (has an extension), don't serve index.html
  if (req.path.includes('.')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(port, () => {
  console.log(`Server is running at port ${port}`);
});
