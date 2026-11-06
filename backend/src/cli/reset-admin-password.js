import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

const ask = (prompt) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
async function hidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode)
    throw new Error("กรุณารันคำสั่งนี้ใน Terminal แบบ interactive");
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk) => {
      const key = chunk.toString();
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.exit(130);
      }
      if (key === "\r" || key === "\n") {
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        resolve(value);
      } else if (key === "\u007f" || key === "\u0008") {
        if (value.length) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (key.length === 1 && key >= " ") {
        value += key;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  const admins = await prisma.users.findMany({
    where: { roles: { name: "ADMIN" } },
    select: { email: true, full_name: true, is_active: true },
    orderBy: { created_at: "asc" },
  });
  if (!admins.length) throw new Error("ไม่พบบัญชี Admin");
  console.log("บัญชี Admin ที่มีอยู่:");
  for (const user of admins)
    console.log(
      `- ${user.email} (${user.full_name})${user.is_active ? "" : " [ระงับ]"}`,
    );
  const email = (await ask("อีเมลบัญชีที่จะรีเซ็ตรหัสผ่าน: ")).toLowerCase();
  const user = admins.find((item) => item.email.toLowerCase() === email);
  if (!user) throw new Error("อีเมลนี้ไม่ใช่บัญชี Admin");
  if (!user.is_active)
    throw new Error("บัญชีนี้ถูกระงับ ให้ผู้ดูแลระบบเปิดใช้งานก่อน");
  const password = await hidden("รหัสผ่านใหม่ (อย่างน้อย 12 ตัว): ");
  if (password.length < 12)
    throw new Error("รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร");
  await prisma.users.update({
    where: { email: user.email },
    data: { password_hash: await bcrypt.hash(password, 12) },
  });
  console.log(
    "เปลี่ยนรหัสผ่านแล้ว สามารถเข้าสู่ระบบด้วยอีเมลเดิมและรหัสผ่านใหม่",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
