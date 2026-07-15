// Create default application users.
//   node prisma/seed-users.mjs
//
// Default credentials (change after first login in production):
//   admin / admin123  (ADMIN — full access)
//   engg  / engg123   (ENGINEER — daily entry + monitor)
//   zyn   / zyn123    (ZYN — monitor only)

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash("sha256")
    .update(`${password}::powerhouse-mis::user-v1`)
    .digest("hex");
}

const USERS = [
  { username: "admin", password: "admin123", role: "ADMIN" },
  { username: "engg", password: "engg123", role: "ENGINEER" },
  { username: "zyn", password: "zyn123", role: "ZYN" },
];

async function main() {
  for (const u of USERS) {
    const passwordHash = hashPassword(u.password);
    await prisma.user.upsert({
      where: { username: u.username },
      create: { username: u.username, passwordHash, role: u.role },
      update: { passwordHash, role: u.role },
    });
    console.log(`  ✓ ${u.username} (${u.role})`);
  }
  console.log("Users seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
