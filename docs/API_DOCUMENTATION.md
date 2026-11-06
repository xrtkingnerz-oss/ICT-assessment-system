# API

ทุก API อยู่ใต้ `/api` และตอบรูปแบบ `{ success, message?, data }` เมื่อสำเร็จ; error ตอบ `{ success:false, error:{code,message} }` ระบุ `Authorization: Bearer <access-token>` สำหรับ API ภายใน

| กลุ่ม | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/change-password`, `PUT /auth/profile` |
| Users (Admin) | `GET/POST /users`, `GET/PUT/DELETE /users/:id`, `PATCH /users/:id/status` |
| Categories | `GET/POST /categories`, `GET/PUT/DELETE /categories/:id` (write actions Admin) |
| Assessments | `GET/POST /assessments`, `GET/PUT/DELETE /assessments/:id`, `POST /assessments/:id/publish`, `/close`, `/duplicate` |
| Questions | `GET/POST /assessments/:id/questions`, `PUT/DELETE /questions/:id`, `PUT /assessments/:id/questions/reorder` |
| Public | `GET /public/assessments/:token`, `POST /public/assessments/:token/responses` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/charts` |
| Reports | `GET /reports/assessments/:id`, `GET /reports/assessments/:id/export` (CSV) |

รายการรองรับ `page`, `pageSize`, `search`; รายงาน CSV ใช้ UTF-8 BOM เพื่อเปิดภาษาไทยใน spreadsheet ได้
