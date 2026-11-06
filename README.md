# ICT Online Assessment System

ระบบจัดการแบบประเมินออนไลน์สำหรับศูนย์ ICT ขอนแก่น เชื่อม PostgreSQL เดิมผ่าน Prisma รองรับผู้ดูแล เจ้าหน้าที่ ผู้ตอบสาธารณะ แบบประเมินแบบไดนามิก QR Code และรายงานผล

## เทคโนโลยี

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Recharts, Lucide, React QR Code
- Backend: Node.js ES Modules, Express, Prisma, PostgreSQL, JWT, bcrypt, Zod, Helmet, express-rate-limit

## ติดตั้งและตั้งค่า

ต้องมี Node.js รุ่น LTS และ PostgreSQL ที่มีฐานข้อมูล `ict_assessment` และข้อมูลเดิมอยู่แล้ว

1. ติดตั้ง dependency: `cd backend && npm install` และ `cd frontend && npm install`
2. คัดลอก `backend/.env.example` เป็น `backend/.env` แล้วตั้ง `DATABASE_URL` ให้ชี้ไปยังฐานข้อมูลเดิม และตั้ง `JWT_SECRET` เป็นค่าสุ่มยาวอย่างน้อย 32 ตัวอักษร
3. ตรวจ schema โดยใช้ `cd backend && npm run db:pull` (อ่าน schema เท่านั้น) และสร้าง Client ด้วย `npm run db:generate`
4. เปิด Backend: `cd backend && npm run dev` (พอร์ต 5000)
5. เปิด Frontend อีก terminal: `cd frontend && npm run dev` (พอร์ต 5173)

ห้ามใช้คำสั่ง reset, `db push`, migration หรือ seed กับฐานข้อมูลที่มีข้อมูลเดิมโดยไม่ทบทวนผลกระทบ

### ชุดข้อมูลสาธิตแบบไม่ระบุตัวบุคคล

หากต้องการเพิ่มชุดข้อมูลสำหรับดู Dashboard/รายงาน ใช้ `cd backend && npm run demo:add` คำสั่งนี้เพิ่มแบบประเมินที่ปิดรับ 1 ชุด คำถาม 4 ข้อ และคำตอบนิรนาม 18 รายการ โดยติดป้าย `[ข้อมูลสาธิต]` และไม่เปลี่ยนข้อมูลเดิม คำสั่งตรวจ marker ก่อนเพิ่ม จึงไม่สร้างชุดเดิมซ้ำ ข้อมูลนี้เป็นข้อมูลสังเคราะห์ ไม่ใช่ผลประเมินจริงของหน่วยงาน

## บัญชี Admin

ไม่มีการสมมติรหัสผ่านของบัญชี seed เดิม สร้างบัญชี Admin ใหม่ผ่าน `cd backend && npm run admin:create` แล้วป้อนชื่อ อีเมล และรหัสผ่านแบบไม่แสดงบนหน้าจอ คำสั่งนี้สร้างเฉพาะบัญชีใหม่และ hash รหัสผ่านด้วย bcrypt; ไม่แก้ไขบัญชีเดิม หากไม่มี Role `ADMIN` ในฐานข้อมูล คำสั่งจะหยุดโดยไม่เปลี่ยนข้อมูล

หากลืมรหัสผ่าน ใช้ `cd backend && npm run admin:reset-password` เลือกบัญชี Admin จากอีเมลที่แสดง แล้วป้อนรหัสใหม่ (หน้าจอแสดง `*` ขณะพิมพ์)

## คุณสมบัติหลัก

- เข้าสู่ระบบด้วย JWT, role authorization, account status, เปลี่ยนรหัสผ่านและแก้ไขโปรไฟล์
- จัดการบัญชีผู้ใช้ หมวดหมู่ แบบประเมิน และคำถาม
- เผยแพร่แบบประเมินด้วย public token, URL และ QR Code PNG
- รับคำตอบโดยไม่ต้อง login พร้อมตรวจประเภทคำถาม ตัวเลือก และช่วงคะแนนก่อนบันทึก transaction
- Dashboard และรายงานคำนวณจาก PostgreSQL พร้อม CSV และ Browser Print

ดูวิธีใช้งาน API, ข้อมูลฐานข้อมูล และขั้นตอนติดตั้งที่ `docs/`
