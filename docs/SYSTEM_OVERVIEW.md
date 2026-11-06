# ภาพรวมระบบ

Frontend แบบ SPA ทำงานที่ Vite และเรียก API ของ Express ผ่าน `VITE_API_URL` ระบบภายในใช้ Access Token อายุ 8 ชั่วโมงใน sessionStorage; Public Assessment เข้าถึงได้โดยไม่ต้องเข้าสู่ระบบ Backend ตรวจ role และเจ้าของแบบประเมิน และ Prisma ใช้ PostgreSQL เดิม

เส้นทางหลัก: Admin เข้าระบบ → สร้าง Staff → Staff สร้างแบบประเมินและคำถาม → เผยแพร่ → ผู้ตอบสแกน QR → ส่งคำตอบแบบ transaction → Dashboard/รายงานอ่านข้อมูลจริง

การป้องกันข้อมูล: bcrypt cost 12, JWT secret ใน environment, Helmet, CORS allowlist, rate limit, Zod validation, transaction ตอนรับคำตอบ, lock คำถามหลังเผยแพร่หรือมีคำตอบ, ป้องกันลบ Admin คนสุดท้ายและหมวดหมู่ที่ถูกอ้างอิง

ข้อจำกัด: idempotency key ของ public submission เก็บใน memory ของ process และหมดอายุในหนึ่งชั่วโมง; ถ้า restart ระหว่าง retry จะไม่มีบันทึก idempotency ข้าม process เพราะ schema เดิมไม่มีคอลัมน์สำหรับ key
