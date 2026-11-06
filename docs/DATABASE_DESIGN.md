# โครงสร้างฐานข้อมูล

Prisma schema ใน `backend/prisma/schema.prisma` สร้างจาก `prisma db pull` กับ PostgreSQL ที่ตั้งค่าใน `backend/.env` และตรวจพบ 9 ตาราง: `roles`, `users`, `assessment_categories`, `assessments`, `questions`, `question_options`, `responses`, `answers`, `answer_options` พร้อม ENUM เดิมและ UUID keys

ความสัมพันธ์: Role มี Users; User สร้าง Assessments; Category มี Assessments; Assessment มี Questions และ Responses; Question มี Options และ Answers; Response มี Answers; Answer เชื่อมตัวเลือกผ่าน Answer Options

พบ check constraint `chk_assessment_dates` ในฐานข้อมูลจริง Prisma Client ไม่บังคับ check constraint นี้ แต่ยังคงอยู่ใน PostgreSQL และการเขียนต้องกำหนดวันเริ่มต้นก่อนวันสิ้นสุด

การเปลี่ยน schema ให้ใช้แนวทาง expand-and-contract ที่ตรวจผลกระทบล่วงหน้า ห้าม reset, drop, truncate, `db push` หรือแก้ seed เดิม
