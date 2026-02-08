/**
 * 管理者ユーザー作成スクリプト
 * 実行: npx tsx scripts/create-admin.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import { users, organizations } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createAdmin() {
  console.log("Creating admin user...");

  // まず組織を確認・作成
  let [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.code, "person"));

  if (!org) {
    console.log("Creating 'Person' organization...");
    const result = await db.insert(organizations).values({
      name: "Person",
      code: "person",
      createdAt: new Date().toISOString(),
    }).returning();
    org = result[0];
    console.log("Created organization:", org);
  }

  // adminユーザーが存在するか確認
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"));

  if (existingAdmin) {
    console.log("Admin user already exists:", existingAdmin);

    // パスワードを更新
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        role: "admin",
        organizationId: org.id,
      })
      .where(eq(users.username, "admin"));

    console.log("Admin password updated to 'admin123'");
  } else {
    // adminユーザーを作成
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const [newAdmin] = await db.insert(users).values({
      username: "admin",
      name: "管理者",
      password: hashedPassword,
      role: "admin",
      organizationId: org.id,
    }).returning();

    console.log("Created admin user:", newAdmin);
  }

  console.log("\n✅ Admin user ready!");
  console.log("   Username: admin");
  console.log("   Password: admin123");
  console.log("   Organization: Person");

  process.exit(0);
}

createAdmin().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
