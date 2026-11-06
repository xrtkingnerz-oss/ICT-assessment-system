import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "react-qr-code";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("ict-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
type User = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
};
type Assessment = {
  id: string;
  title: string;
  status: string;
  category?: string;
  categoryId?: string;
  targetGroup?: string;
  responseCount?: number;
  publicToken?: string;
  publicUrl?: string;
  questions?: Question[];
};
type Question = {
  id?: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options: { id?: string; optionText: string; score: number }[];
};
type Category = { id: string; name: string; _count?: { assessments: number } };
const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
const colors = ["#174c82", "#35a5c8", "#f0a64a", "#41a782", "#9a72c6"];
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/assessment/:token" element={<PublicForm />} />
        <Route path="/success" element={<Success />} />
        <Route path="*" element={<Guard />} />
      </Routes>
    </BrowserRouter>
  );
}
function Guard() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("ict-token")) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.data))
      .catch(() => sessionStorage.removeItem("ict-token"))
      .finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังเชื่อมต่อระบบ…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Shell
      user={user}
      onLogout={() => {
        sessionStorage.removeItem("ict-token");
        location.href = "/login";
      }}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assessments" element={<AssessmentList />} />
        <Route path="/assessments/new" element={<AssessmentEditor />} />
        <Route path="/assessments/:id" element={<AssessmentEditor />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
function Shell({
  user,
  onLogout,
  children,
}: {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
    { to: "/assessments", label: "แบบประเมิน", icon: ClipboardList },
    { to: "/categories", label: "หมวดหมู่", icon: FolderKanban },
    ...(user.role === "ADMIN"
      ? [{ to: "/users", label: "ผู้ใช้งาน", icon: Users }]
      : []),
    { to: "/reports", label: "รายงานผล", icon: BarChart3 },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Activity size={21} />
          </div>
          <div>
            <b>ICT Assessment</b>
            <small>ศูนย์ ICT ขอนแก่น</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={17} />
            <span>ข้อมูลเชื่อมต่อฐานข้อมูลจริง</span>
          </div>
          <button
            className="profile-mini"
            onClick={() => (location.href = "/profile")}
          >
            <div className="avatar">{user.fullName.slice(0, 1)}</div>
            <span>
              <b>{user.fullName}</b>
              <small>
                {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
              </small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="crumb">
            ศูนย์ ICT <span>/</span> <b>ระบบประเมินออนไลน์</b>
          </div>
          <div className="top-user">
            <div className="avatar">{user.fullName.slice(0, 1)}</div>
            <div>
              <b>{user.fullName}</b>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              title="ออกจากระบบ"
              onClick={onLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {children}
      </main>
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}
    </div>
  );
}
function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow || "ICT ONLINE ASSESSMENT"}</div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.get("/dashboard/summary"), api.get("/dashboard/charts")])
      .then(([s, c]) => {
        setSummary(s.data.data);
        setCharts(c.data.data);
      })
      .catch(() =>
        setError("ไม่สามารถโหลดข้อมูลได้ ตรวจสอบการเชื่อมต่อ Backend"),
      );
  }, []);
  if (error)
    return (
      <section className="content">
        <PageHeader title="ภาพรวม" />
        <div className="alert error">{error}</div>
      </section>
    );
  if (!summary)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังโหลดข้อมูลจริง…
      </div>
    );
  const stats = [
    [
      "แบบประเมินทั้งหมด",
      summary.assessments.total,
      "รายการ",
      ClipboardList,
      "blue",
    ],
    [
      "กำลังเผยแพร่",
      summary.assessments.published,
      "รายการ",
      Activity,
      "green",
    ],
    ["ผู้ตอบทั้งหมด", summary.responses.total, "คน", Users, "purple"],
    ["เจ้าหน้าที่", summary.staff, "บัญชี", ShieldCheck, "orange"],
  ];
  return (
    <section className="content">
      <PageHeader
        eyebrow="ศูนย์ ICT ขอนแก่น"
        title="ภาพรวมระบบ"
        subtitle="ติดตามสถานะแบบประเมินและการตอบกลับจากฐานข้อมูลจริง"
        action={
          <Link className="button primary" to="/assessments/new">
            <Plus size={17} />
            สร้างแบบประเมิน
          </Link>
        }
      />
      <div className="stat-grid">
        {stats.map(([label, value, unit, Icon, tone]: any) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={19} />
            </div>
            <div className="stat-title">{label}</div>
            <div className="stat-value">
              {value}
              <small>{unit}</small>
            </div>
            <div className="stat-foot">
              <span className="dot" />
              อัปเดตจากฐานข้อมูล
            </div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>แนวโน้มคำตอบ</h2>
              <p>จำนวนผู้ตอบรายวัน · 30 วันล่าสุด</p>
            </div>
            <span className="tag">LIVE DATA</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.daily || []}>
                <CartesianGrid stroke="#edf1f5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#8592a3" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#8592a3" }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2876b8"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#2876b8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>ประเภทผู้ตอบ</h2>
              <p>สัดส่วนการตอบทั้งหมด</p>
            </div>
          </div>
          <div className="pie-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "ภายใน",
                      value: charts?.respondents?.internal || 0,
                    },
                    {
                      name: "ภายนอก",
                      value: charts?.respondents?.external || 0,
                    },
                  ]}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={5}
                >
                  {[0, 1].map((i) => (
                    <Cell key={i} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center">
              <b>{summary.responses.total}</b>
              <small>คำตอบ</small>
            </div>
          </div>
          <div className="legend">
            <span>
              <i style={{ background: colors[0] }} />
              ภายใน <b>{summary.responses.internal}</b>
            </span>
            <span>
              <i style={{ background: colors[1] }} />
              ภายนอก <b>{summary.responses.external}</b>
            </span>
          </div>
        </div>
      </div>
      <div className="panel recent">
        <div className="panel-head">
          <div>
            <h2>แบบประเมินล่าสุด</h2>
            <p>รายการที่สร้างในระบบ</p>
          </div>
          <Link to="/assessments">ดูทั้งหมด →</Link>
        </div>
        {summary.recent.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อแบบประเมิน</th>
                  <th>หมวดหมู่</th>
                  <th>สถานะ</th>
                  <th>คำตอบ</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((a: Assessment) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.title}</b>
                    </td>
                    <td>{a.category || "—"}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>{a.responseCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="ยังไม่มีแบบประเมิน"
            text="สร้างแบบประเมินแรกเพื่อเริ่มเก็บข้อมูล"
          />
        )}
      </div>
    </section>
  );
}
function Status({ value }: { value: string }) {
  const names: any = {
    DRAFT: "ฉบับร่าง",
    PUBLISHED: "เผยแพร่",
    CLOSED: "ปิดแล้ว",
  };
  return (
    <span className={`status ${value.toLowerCase()}`}>
      <i />
      {names[value] || value}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <ClipboardList size={30} />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
function AssessmentList() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/assessments", { params: { search } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setError("โหลดรายการไม่สำเร็จ"));
  }, [search]);
  return (
    <section className="content">
      <PageHeader
        title="แบบประเมิน"
        subtitle="สร้าง จัดการ และติดตามแบบประเมินของหน่วยงาน"
        action={
          <Link className="button primary" to="/assessments/new">
            <Plus size={17} />
            สร้างแบบประเมิน
          </Link>
        }
      />
      <div className="toolbar">
        <label className="searchbox">
          <Search size={17} />
          <input
            placeholder="ค้นหาชื่อแบบประเมิน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">{items.length} รายการ</span>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>แบบประเมิน</th>
              <th>หมวดหมู่</th>
              <th>สถานะ</th>
              <th>ผู้ตอบ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link className="table-link" to={`/assessments/${a.id}`}>
                    {a.title}
                  </Link>
                  <small className="table-sub">
                    กลุ่มเป้าหมาย {a.targetGroup}
                  </small>
                </td>
                <td>{a.category || "—"}</td>
                <td>
                  <Status value={a.status} />
                </td>
                <td>{a.responseCount || 0}</td>
                <td>
                  <Link className="text-action" to={`/assessments/${a.id}`}>
                    เปิดจัดการ →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty
            title="ไม่พบแบบประเมิน"
            text="ลองค้นหาด้วยคำอื่น หรือสร้างแบบประเมินใหม่"
          />
        )}
      </div>
    </section>
  );
}
function AssessmentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [message, setMessage] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.data));
    if (id)
      api
        .get(`/assessments/${id}`)
        .then((r) => {
          setAssessment(r.data.data);
          setQuestions(r.data.data.questions || []);
        })
        .catch(() => setMessage("เปิดแบบประเมินไม่สำเร็จ"));
  }, [id]);
  const saveAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      description: fd.get("description"),
      categoryId: fd.get("categoryId"),
      targetGroup: fd.get("targetGroup"),
    };
    try {
      const r = id
        ? await api.put(`/assessments/${id}`, body)
        : await api.post("/assessments", body);
      setAssessment(r.data.data);
      setMessage("บันทึกข้อมูลแบบประเมินแล้ว");
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "บันทึกไม่สำเร็จ");
    }
  };
  const addQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assessment) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const type = String(fd.get("questionType"));
    const options = String(fd.get("options") || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((optionText, index) => ({ optionText, score: index + 1 }));
    try {
      const r = await api.post(`/assessments/${assessment.id}/questions`, {
        questionText: fd.get("questionText"),
        questionType: type,
        isRequired: fd.get("required") === "on",
        sortOrder: questions.length,
        options,
      });
      const q = r.data.data;
      setQuestions([
        ...questions,
        {
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          isRequired: q.is_required,
          options: q.question_options.map((o: any) => ({
            id: o.id,
            optionText: o.option_text,
            score: o.score,
          })),
        },
      ]);
      form.reset();
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "เพิ่มคำถามไม่สำเร็จ");
    }
  };
  const publish = async () => {
    try {
      const r = await api.post(`/assessments/${assessment?.id}/publish`);
      setAssessment({
        ...assessment!,
        status: "PUBLISHED",
        publicToken: r.data.data.public_token,
      });
      setQrUrl(r.data.data.publicUrl);
      setMessage("เผยแพร่แบบประเมินแล้ว");
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "เผยแพร่ไม่สำเร็จ");
    }
  };
  const downloadQr = () => {
    const svg = document.querySelector("#public-qr svg") as SVGElement | null;
    if (!svg) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 640;
      canvas.getContext("2d")?.drawImage(img, 0, 0, 640, 640);
      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = "assessment-qr.png";
        a.click();
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };
  return (
    <section className="content">
      <PageHeader
        title={id ? "แก้ไขแบบประเมิน" : "สร้างแบบประเมิน"}
        subtitle="กำหนดข้อมูลและคำถาม จากนั้นเผยแพร่พร้อม QR Code"
        action={
          <button
            className="button outline"
            onClick={() => navigate("/assessments")}
          >
            กลับรายการ
          </button>
        }
      />
      {message && <div className="alert info">{message}</div>}
      <div className="editor-grid">
        <div className="panel form-panel">
          <h2>รายละเอียดแบบประเมิน</h2>
          <form onSubmit={saveAssessment} className="form-grid">
            <label>
              ชื่อแบบประเมิน
              <input name="title" required defaultValue={assessment?.title} />
            </label>
            <label>
              หมวดหมู่
              <select
                name="categoryId"
                required
                defaultValue={assessment?.categoryId || ""}
              >
                <option value="" disabled>
                  เลือกหมวดหมู่
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              กลุ่มเป้าหมาย
              <select
                name="targetGroup"
                defaultValue={assessment?.targetGroup || "BOTH"}
              >
                <option value="BOTH">ภายในและภายนอก</option>
                <option value="INTERNAL">ภายใน</option>
                <option value="EXTERNAL">ภายนอก</option>
              </select>
            </label>
            <label className="span-2">
              คำอธิบาย
              <textarea
                name="description"
                rows={3}
                defaultValue={(assessment as any)?.description || ""}
              />
            </label>
            <div className="span-2">
              <button className="button primary">บันทึกรายละเอียด</button>
              {assessment && (
                <span className="inline-status">
                  <Status value={assessment.status} />
                </span>
              )}
            </div>
          </form>
        </div>
        {assessment && (
          <div className="panel form-panel">
            <h2>เพิ่มคำถาม</h2>
            <form onSubmit={addQuestion} className="form-grid">
              <label className="span-2">
                ข้อความคำถาม
                <input
                  name="questionText"
                  required
                  placeholder="เช่น ท่านพึงพอใจต่อการให้บริการเพียงใด"
                />
              </label>
              <label>
                ประเภทคำถาม
                <select name="questionType">
                  <option value="RATING">คะแนน 1–5</option>
                  <option value="SINGLE_CHOICE">เลือกหนึ่งข้อ</option>
                  <option value="MULTIPLE_CHOICE">เลือกได้หลายข้อ</option>
                  <option value="SHORT_TEXT">ข้อความสั้น</option>
                  <option value="LONG_TEXT">ข้อความยาว</option>
                  <option value="NUMBER">ตัวเลข</option>
                </select>
              </label>
              <label className="check-label">
                <input name="required" type="checkbox" /> จำเป็นต้องตอบ
              </label>
              <label className="span-2">
                ตัวเลือก{" "}
                <small>(หนึ่งรายการต่อบรรทัด สำหรับคำถามแบบเลือก)</small>
                <textarea
                  name="options"
                  rows={3}
                  placeholder={"ดีมาก\nปานกลาง\nน้อย"}
                />
              </label>
              <button className="button secondary">
                <Plus size={16} />
                เพิ่มคำถาม
              </button>
            </form>
            <div className="question-list">
              {questions.map((q, i) => (
                <div className="question-row" key={q.id}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>
                    {q.questionText}
                    <small>
                      {q.questionType} {q.isRequired ? "· จำเป็น" : ""}
                    </small>
                  </span>
                  <button
                    className="quiet"
                    onClick={async () => {
                      try {
                        await api.delete(`/questions/${q.id}`);
                        setQuestions(questions.filter((_, n) => n !== i));
                      } catch (e: any) {
                        setMessage(
                          e.response?.data?.error?.message ||
                            "ลบคำถามไม่สำเร็จ",
                        );
                      }
                    }}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
            <button
              className="button primary full"
              disabled={!questions.length || assessment.status === "PUBLISHED"}
              onClick={publish}
            >
              เผยแพร่แบบประเมิน
            </button>
          </div>
        )}
        {qrUrl && (
          <div className="panel qr-panel">
            <div id="public-qr">
              <QRCode value={qrUrl} size={160} />
            </div>
            <h2>แบบประเมินพร้อมตอบ</h2>
            <p>{qrUrl}</p>
            <div className="button-row">
              <button
                className="button outline"
                onClick={() => navigator.clipboard.writeText(qrUrl)}
              >
                คัดลอกลิงก์
              </button>
              <button className="button primary" onClick={downloadQr}>
                <ArrowDownToLine size={16} />
                ดาวน์โหลด PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    api
      .get("/users", { params: { search } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setMessage("โหลดผู้ใช้งานไม่ได้"));
  }, [search]);
  return (
    <section className="content">
      <PageHeader
        title="ผู้ใช้งาน"
        subtitle="จัดการสิทธิ์ Admin และเจ้าหน้าที่"
      />
      <div className="panel form-panel">
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            try {
              await api.post("/users", {
                fullName: f.get("fullName"),
                email: f.get("email"),
                password: f.get("password"),
                role: f.get("role"),
              });
              setMessage("สร้างบัญชีแล้ว");
              form.reset();
              const r = await api.get("/users");
              setItems(r.data.data.items);
            } catch (x: any) {
              setMessage(
                x.response?.data?.error?.message || "สร้างบัญชีไม่สำเร็จ",
              );
            }
          }}
        >
          <input name="fullName" placeholder="ชื่อ-นามสกุล" required />
          <input name="email" type="email" placeholder="อีเมล" required />
          <input
            name="password"
            type="password"
            placeholder="รหัสผ่านอย่างน้อย 10 ตัว"
            minLength={10}
            required
          />
          <select name="role">
            <option>STAFF</option>
            <option>ADMIN</option>
          </select>
          <button className="button primary">เพิ่มบัญชี</button>
        </form>
        <label className="searchbox">
          <Search size={17} />
          <input
            placeholder="ค้นหาผู้ใช้"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {message && <div className="alert info">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const load = () => api.get("/categories").then((r) => setItems(r.data.data));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="content">
      <PageHeader
        title="หมวดหมู่"
        subtitle="จัดกลุ่มแบบประเมินให้ค้นหาและรายงานได้ง่าย"
      />
      <div className="panel form-panel">
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            try {
              await api.post("/categories", {
                name: f.get("name"),
                description: f.get("description"),
              });
              setMessage("เพิ่มหมวดหมู่แล้ว");
              form.reset();
              load();
            } catch (x: any) {
              setMessage(x.response?.data?.error?.message || "เพิ่มไม่สำเร็จ");
            }
          }}
        >
          <input name="name" placeholder="ชื่อหมวดหมู่ใหม่" required />
          <input name="description" placeholder="คำอธิบาย (ไม่บังคับ)" />
          <button className="button primary">
            <Plus size={16} />
            เพิ่มหมวดหมู่
          </button>
        </form>
        {message && <div className="alert info">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อหมวดหมู่</th>
                <th>แบบประเมิน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c._count?.assessments || 0} รายการ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
function ReportsPage() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<any>();
  useEffect(() => {
    api.get("/assessments").then((r) => setItems(r.data.data.items));
  }, []);
  useEffect(() => {
    if (selected)
      api
        .get(`/reports/assessments/${selected}`)
        .then((r) => setData(r.data.data))
        .catch(() => setData(null));
  }, [selected]);
  return (
    <section className="content">
      <PageHeader title="รายงานผล" subtitle="สรุปคำตอบและคะแนนจากข้อมูลจริง" />
      <div className="panel form-panel">
        <label>
          เลือกแบบประเมิน
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">เลือกแบบประเมิน</option>
            {items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        {data && (
          <>
            <div className="report-stats">
              <div>
                <small>ผู้ตอบทั้งหมด</small>
                <b>{data.summary.total}</b>
              </div>
              <div>
                <small>ภายใน</small>
                <b>{data.summary.internal}</b>
              </div>
              <div>
                <small>ภายนอก</small>
                <b>{data.summary.external}</b>
              </div>
              <div>
                <small>คะแนนเฉลี่ย</small>
                <b>
                  {data.summary.average == null
                    ? "—"
                    : data.summary.average.toFixed(2)}
                </b>
              </div>
            </div>
            <div className="button-row">
              <button
                className="button outline"
                onClick={async () => {
                  const r = await api.get(
                    `/reports/assessments/${selected}/export`,
                    { responseType: "blob" },
                  );
                  const url = URL.createObjectURL(r.data);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "assessment-report.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <ArrowDownToLine size={16} />
                ส่งออก CSV
              </button>
              <button className="button outline" onClick={() => window.print()}>
                พิมพ์รายงาน
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>คำถาม</th>
                    <th>ประเภท</th>
                    <th>คะแนนเฉลี่ย</th>
                    <th>ตัวเลือก/คำตอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map((q: any) => (
                    <tr key={q.id}>
                      <td>{q.question}</td>
                      <td>{q.type}</td>
                      <td>{q.average == null ? "—" : q.average.toFixed(2)}</td>
                      <td>
                        {Object.entries(q.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ") ||
                          q.texts.slice(0, 3).join(" · ") ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function ProfilePage({ user }: { user: User }) {
  const [message, setMessage] = useState("");
  return (
    <section className="content">
      <PageHeader
        title="บัญชีของฉัน"
        subtitle="ข้อมูลผู้ใช้งานและความปลอดภัย"
      />
      <div className="panel form-panel narrow">
        <h2>{user.fullName}</h2>
        <p className="muted">
          {user.email} · {user.role}
        </p>
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api.put("/auth/change-password", {
                currentPassword: f.get("currentPassword"),
                newPassword: f.get("newPassword"),
              });
              setMessage("เปลี่ยนรหัสผ่านแล้ว");
            } catch (x: any) {
              setMessage(
                x.response?.data?.error?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
              );
            }
          }}
        >
          <label className="span-2">
            รหัสผ่านปัจจุบัน
            <input name="currentPassword" type="password" required />
          </label>
          <label className="span-2">
            รหัสผ่านใหม่
            <input name="newPassword" type="password" minLength={10} required />
          </label>
          <button className="button primary">บันทึกรหัสผ่าน</button>
        </form>
        {message && <div className="alert info">{message}</div>}
      </div>
    </section>
  );
}
function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      const r = await api.post("/auth/login", values);
      sessionStorage.setItem("ict-token", r.data.data.token);
      navigate("/");
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message ||
          "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบ Backend และบัญชี",
      );
    }
  });
  return (
    <div className="login-page">
      <div className="login-aside">
        <div className="brand light">
          <div className="brand-icon">
            <Activity />
          </div>
          <div>
            <b>ICT Assessment</b>
            <small>ศูนย์ ICT ขอนแก่น</small>
          </div>
        </div>
        <div className="login-message">
          <span className="eyebrow">ICT KHON KAEN</span>
          <h1>
            เสียงของคุณ
            <br />
            ขับเคลื่อนบริการ
            <br />
            <em>ให้ดียิ่งขึ้น</em>
          </h1>
          <p>
            ระบบประเมินออนไลน์และวิเคราะห์ผล
            <br />
            เพื่อการพัฒนาบริการอย่างต่อเนื่อง
          </p>
          <div className="login-decoration">
            <div />
            <div />
            <div />
          </div>
        </div>
        <small className="copyright">© 2026 ศูนย์ ICT ขอนแก่น</small>
      </div>
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-symbol">
            <ShieldCheck />
          </div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>เข้าสู่ระบบ</h2>
          <p>กรุณาใช้บัญชีเจ้าหน้าที่เพื่อดำเนินการต่อ</p>
          <form onSubmit={submit}>
            <label>
              อีเมล
              <input
                {...register("email")}
                type="email"
                placeholder="name@organization.go.th"
                autoComplete="username"
              />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            <label>
              รหัสผ่าน
              <input
                {...register("password")}
                type="password"
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
              />
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="button primary full" disabled={isSubmitting}>
              {isSubmitting ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
          <div className="login-help">บัญชีผู้ใช้จัดการโดยผู้ดูแลระบบ</div>
          <div className="public-link">
            ผู้ตอบแบบประเมินสามารถเปิดผ่าน QR Code โดยไม่ต้องเข้าสู่ระบบ
          </div>
        </div>
      </div>
    </div>
  );
}
function PublicForm() {
  const { token = "" } = useParams();
  const [survey, setSurvey] = useState<any>();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    api
      .get(`/public/assessments/${token}`)
      .then((r) => setSurvey(r.data.data))
      .catch(() => setError("แบบประเมินนี้ไม่เปิดรับคำตอบหรือไม่พบลิงก์"));
  }, [token]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const answers = survey.questions.map((q: any) => {
      const raw = f.get(`q-${q.id}`);
      return {
        questionId: q.id,
        text: q.type.includes("TEXT") ? String(raw || "") : undefined,
        number:
          ["RATING", "NUMBER"].includes(q.type) && raw !== null && raw !== ""
            ? Number(raw)
            : undefined,
        optionIds:
          q.type === "MULTIPLE_CHOICE"
            ? f.getAll(`q-${q.id}`).map(String)
            : q.type === "SINGLE_CHOICE" && raw
              ? [String(raw)]
              : [],
      };
    });
    try {
      await api.post(
        `/public/assessments/${token}/responses`,
        {
          respondentType: f.get("respondentType"),
          name: f.get("name") || null,
          email: f.get("email") || null,
          answers,
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      navigate("/success");
    } catch (x: any) {
      setError(x.response?.data?.error?.message || "ส่งคำตอบไม่สำเร็จ");
    }
  };
  if (error)
    return (
      <div className="public-page">
        <div className="public-card">
          <div className="brand-icon">
            <Activity />
          </div>
          <h1>ไม่สามารถเปิดแบบประเมิน</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  if (!survey)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังโหลดแบบประเมิน…
      </div>
    );
  return (
    <div className="public-page">
      <form className="public-card" onSubmit={submit}>
        <div className="public-brand">
          <div className="brand-icon">
            <Activity />
          </div>
          <span>ศูนย์ ICT ขอนแก่น</span>
        </div>
        <div className="eyebrow">แบบประเมินออนไลน์</div>
        <h1>{survey.title}</h1>
        <p>
          {survey.description ||
            "ความคิดเห็นของท่านมีส่วนสำคัญในการพัฒนาบริการ"}
        </p>
        <div className="public-fields">
          <label>
            ประเภทผู้ตอบ
            <select name="respondentType" required>
              <option value="INTERNAL">บุคลากรภายใน</option>
              <option value="EXTERNAL">บุคคลภายนอก</option>
            </select>
          </label>
          <label>
            ชื่อ (ไม่บังคับ)
            <input name="name" placeholder="ไม่ระบุชื่อได้" />
          </label>
          <label>
            อีเมล (ไม่บังคับ)
            <input name="email" type="email" placeholder="name@example.com" />
          </label>
        </div>
        {survey.questions.map((q: any, i: number) => (
          <div className="public-question" key={q.id}>
            <label>
              <b>
                {i + 1}. {q.text}
              </b>
              {q.required && <em> *</em>}
            </label>
            {q.type === "SHORT_TEXT" ? (
              <input name={`q-${q.id}`} required={q.required} />
            ) : q.type === "LONG_TEXT" ? (
              <textarea name={`q-${q.id}`} rows={4} required={q.required} />
            ) : q.type === "RATING" ? (
              <div className="rating-options">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={n}
                      required={q.required}
                    />
                    <span>{n}</span>
                  </label>
                ))}
              </div>
            ) : q.type === "NUMBER" ? (
              <input name={`q-${q.id}`} type="number" required={q.required} />
            ) : (
              <div className="choice-list">
                {q.options.map((o: any) => (
                  <label key={o.id}>
                    <input
                      type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                      name={`q-${q.id}`}
                      value={o.id}
                      required={q.required && q.type === "SINGLE_CHOICE"}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        {error && <div className="alert error">{error}</div>}
        <button className="button primary full">ส่งคำตอบ</button>
        <small className="privacy-note">
          <ShieldCheck size={14} />
          ระบบใช้ข้อมูลเพื่อการประเมินและรักษาความเป็นส่วนตัว
        </small>
      </form>
    </div>
  );
}
function Success() {
  return (
    <div className="public-page">
      <div className="public-card success-card">
        <div className="success-check">✓</div>
        <div className="eyebrow">SUBMISSION COMPLETE</div>
        <h1>ขอบคุณสำหรับความคิดเห็น</h1>
        <p>
          ระบบบันทึกคำตอบของท่านเรียบร้อยแล้ว
          ข้อมูลของท่านช่วยให้เราพัฒนาบริการได้ดียิ่งขึ้น
        </p>
        <Link className="button outline" to="/login">
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
export default App;
