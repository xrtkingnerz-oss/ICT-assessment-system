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
    throw new Error(
      "กรุณารันคำสั่งนี้ใน Terminal แบบ interactive เพื่อป้อนรหัสผ่านอย่างปลอดภัย",
    );
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
  const fullName = await ask("ชื่อผู้ดูแลระบบ: ");
  const email = (await ask("อีเมลผู้ดูแลระบบ: ")).toLowerCase();
  const password = await hidden("รหัสผ่าน (อย่างน้อย 12 ตัว): ");
  if (fullName.length < 2 || !email.includes("@") || password.length < 12)
    throw new Error(
      "ข้อมูลไม่ถูกต้อง: ชื่อต้องมี 2 ตัวอักษร อีเมลต้องถูกต้อง และรหัสผ่านอย่างน้อย 12 ตัว",
    );
  const role = await prisma.roles.findUnique({ where: { name: "ADMIN" } });
  if (!role)
    throw new Error("ไม่พบ Role ADMIN ในฐานข้อมูล ตรวจสอบ Seed Data เดิมก่อน");
  if (await prisma.users.findUnique({ where: { email } }))
    throw new Error("อีเมลนี้มีบัญชีแล้ว");
  await prisma.users.create({
    data: {
      full_name: fullName,
      email,
      password_hash: await bcrypt.hash(password, 12),
      role_id: role.id,
      is_active: true,
    },
  });
  console.log("สร้างบัญชี Admin แล้ว");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
