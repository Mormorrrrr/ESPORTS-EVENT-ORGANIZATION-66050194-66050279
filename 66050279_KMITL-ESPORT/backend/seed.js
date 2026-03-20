import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed starting...");

  // 1. Ensure Admin User exists (ID: 1)
  let admin = await prisma.user.findUnique({ where: { username: "admin29" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: "admin29",
        email: "admin@admin.com",
        password: "admin123",
        role: "Admin",
      },
    });
    console.log("Created Admin user");
  }

  // 2. Fetch all tournaments to link applications
  const tournaments = await prisma.tournament.findMany();
  if (tournaments.length === 0) {
    console.log("No tournaments found. Please create tournaments first.");
    return;
  }

  // 3. Mock Teams Data
  const mockTeams = [
    { team_name: "XERXIA", leader_name: "Crws", members: ["Sushiboys", "Foxz", "Surf", "sScary"] },
    { team_name: "Talon Esports", leader_name: "Crws", members: ["Sushiboys", "Foxz", "Surf", "Patiphan"] },
    { team_name: "FULL SENSE", leader_name: "SuperBusS", members: ["JohnOlsen", "ChAlalala", "LAMMYSNAX", "PTC"] },
    { team_name: "Sharper Esport", leader_name: "Acetics", members: ["BOOMBURAPA", "Kntz", "Niffy", "Patt"] },
    { team_name: "MiTH", leader_name: "Wannabe", members: ["Kongared", "Aloha", "Kadoom", "Laz"] },
  ];

  for (const mock of mockTeams) {
    // Create Team
    const team = await prisma.team.upsert({
      where: { team_name: mock.team_name },
      update: {},
      create: {
        team_name: mock.team_name,
        leader_name: mock.leader_name,
        member_1: mock.members[0] || null,
        member_2: mock.members[1] || null,
        member_3: mock.members[2] || null,
        member_4: mock.members[3] || null,
        created_by: admin.user_id,
      },
    });
    console.log(`Team: ${team.team_name} (ID: ${team.team_id})`);

    // Create Applications (Apply to all tournaments)
    for (const tournament of tournaments) {
      await prisma.application.upsert({
        where: {
          app_id: (await prisma.application.findFirst({
            where: { team_id: team.team_id, tournament_id: tournament.tournament_id }
          }))?.app_id || 0
        },
        update: {},
        create: {
          team_id: team.team_id,
          tournament_id: tournament.tournament_id,
          status: "Pending",
        },
      });
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
