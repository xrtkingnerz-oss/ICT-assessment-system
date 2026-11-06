# คู่มือติดตั้ง

1. เตรียม Node.js LTS, npm และ PostgreSQL เดิมที่มีฐานข้อมูล `ict_assessment`
2. ติดตั้ง dependencies ใน `backend` และ `frontend`
3. สร้าง `backend/.env` จาก `.env.example`; กำหนด DATABASE_URL, JWT_SECRET (สุ่มอย่างน้อย 32 ตัว), FRONTEND_URL และ PUBLIC_APP_URL
4. รัน `npm run db:pull` แล้วตรวจ schema ก่อน `npm run db:generate` ห้าม migrate หรือ push เพื่อเริ่มระบบ
5. ถ้าจำเป็นต้องมีบัญชี Admin เพิ่ม ให้รัน `npm run admin:create` ใน terminal แบบ interactive
6. รัน Backend `npm run dev` ในโฟลเดอร์ backend และ Frontend `npm run dev` ในโฟลเดอร์ frontend
7. ตรวจ `/api/health`; ควรแสดง database connected จากนั้นเปิด URL ที่ Vite แจ้ง

ไฟล์ `.env` ต้องอยู่ใน `.gitignore`; อย่าใส่รหัสผ่านหรือ JWT secret ในเอกสารหรือ frontend environment
