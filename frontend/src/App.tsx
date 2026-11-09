import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
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
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldOff,
  ShieldCheck,
  Trash2,
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
type Category = {
  id: string;
  name: string;
  description?: string | null;
  _count?: { assessments: number };
};
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
        <Route path="/categories" element={<CategoriesPage user={user} />} />
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
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
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
                  tick={{ fontSize: 14, fill: "#8592a3" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 14, fill: "#8592a3" }}
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
  const navigate = useNavigate();
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
      <div className="assessment-guide">
        <b>เริ่มทำแบบประเมินสำหรับทดสอบ</b>
        <span>
          สร้างแบบประเมินใหม่ → เพิ่มคำถาม → เผยแพร่ → เปิดลิงก์หรือสแกน QR
          เพื่อลองตอบ
        </span>
        <small>
          แบบประเมินที่เผยแพร่แล้วหรือมีคำตอบ จะล็อกการแก้ไขเพื่อรักษาข้อมูลเดิม
          ใช้ “ทำสำเนา” เพื่อสร้างฉบับร่างสำหรับแก้ไขหรือทดสอบ
        </small>
      </div>
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
                  <div className="assessment-actions">
                    <Link className="text-action" to={`/assessments/${a.id}`}>
                      เปิด →
                    </Link>
                    <button
                      className="text-action-button"
                      onClick={async () => {
                        try {
                          const response = await api.post(
                            `/assessments/${a.id}/duplicate`,
                          );
                          navigate(`/assessments/${response.data.data.id}`);
                        } catch (error: any) {
                          setError(
                            error.response?.data?.error?.message ||
                              "ทำสำเนาแบบประเมินไม่สำเร็จ",
                          );
                        }
                      }}
                    >
                      ทำสำเนา
                    </button>
                  </div>
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
  const [isDuplicating, setIsDuplicating] = useState(false);
  const isLocked = Boolean(
    assessment &&
    (assessment.status !== "DRAFT" || (assessment.responseCount || 0) > 0),
  );
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.data));
    if (id)
      api
        .get(`/assessments/${id}`)
        .then((r) => {
          setAssessment(r.data.data);
          setQuestions(r.data.data.questions || []);
          if (r.data.data.publicToken) {
            setQrUrl(
              `${window.location.origin}/assessment/${r.data.data.publicToken}`,
            );
          }
        })
        .catch(() => setMessage("เปิดแบบประเมินไม่สำเร็จ"));
  }, [id]);
  const duplicateAssessment = async () => {
    if (!assessment) return;
    setIsDuplicating(true);
    try {
      const response = await api.post(
        `/assessments/${assessment.id}/duplicate`,
      );
      navigate(`/assessments/${response.data.data.id}`);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error?.message || "ทำสำเนาแบบประเมินไม่สำเร็จ",
      );
    } finally {
      setIsDuplicating(false);
    }
  };
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
        subtitle="1. บันทึกรายละเอียด  2. เพิ่มคำถาม  3. เผยแพร่เพื่อรับคำตอบ"
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
      {isLocked && assessment && (
        <div className="assessment-lock-notice">
          <div>
            <b>
              แบบประเมินนี้
              {assessment.status === "PUBLISHED"
                ? "เผยแพร่แล้ว"
                : "ปิดรับคำตอบแล้ว"}
              {assessment.responseCount
                ? ` และมีคำตอบ ${assessment.responseCount} รายการ`
                : ""}
            </b>
            <span>
              ระบบล็อกการแก้ไขเพื่อรักษาคำถามและข้อมูลคำตอบเดิม
              ทำสำเนาเป็นฉบับร่างหากต้องการแก้ไขหรือใช้ทดสอบ
            </span>
          </div>
          <button
            className="button primary"
            onClick={() => void duplicateAssessment()}
            disabled={isDuplicating}
          >
            <ClipboardList size={16} />
            {isDuplicating ? "กำลังทำสำเนา…" : "ทำสำเนาเป็นฉบับร่าง"}
          </button>
        </div>
      )}
      <div className="editor-grid">
        <div className="panel form-panel">
          <h2>รายละเอียดแบบประเมิน</h2>
          <form
            key={assessment?.id || "new-assessment"}
            onSubmit={saveAssessment}
            className="form-grid"
          >
            <label>
              ชื่อแบบประเมิน
              <input
                name="title"
                required
                disabled={isLocked}
                defaultValue={assessment?.title}
              />
            </label>
            <label>
              หมวดหมู่
              <select
                name="categoryId"
                required
                disabled={isLocked}
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
                disabled={isLocked}
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
                disabled={isLocked}
                defaultValue={(assessment as any)?.description || ""}
              />
            </label>
            <div className="span-2">
              <button className="button primary" disabled={isLocked}>
                บันทึกรายละเอียด
              </button>
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
            <h2>{isLocked ? "คำถามในแบบประเมิน" : "เพิ่มคำถาม"}</h2>
            {!isLocked && (
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
            )}
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
                  {!isLocked && (
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
                  )}
                </div>
              ))}
            </div>
            {assessment.status === "DRAFT" && (
              <button
                className="button primary full"
                disabled={!questions.length}
                onClick={publish}
              >
                เผยแพร่แบบประเมิน
              </button>
            )}
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
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [formError, setFormError] = useState("");
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .get("/users", {
        params: {
          search,
          page,
          pageSize,
          ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        },
      })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data.data.items);
        setTotal(response.data.data.total);
      })
      .catch((error: any) => {
        if (!cancelled) {
          setMessageType("error");
          setMessage(
            error.response?.data?.error?.message || "โหลดผู้ใช้งานไม่ได้",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, roleFilter, statusFilter, page, refreshKey]);

  function openCreateModal() {
    setEditingUser(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormError("");
    setModalOpen(true);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "").trim();
    const payload = {
      fullName: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      role: String(formData.get("role")) as User["role"],
      isActive: formData.get("isActive") === "on",
      ...(password ? { password } : {}),
    };

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        setMessage("บันทึกการแก้ไขผู้ใช้แล้ว");
      } else {
        await api.post("/users", payload);
        setMessage("เพิ่มบัญชีผู้ใช้แล้ว");
        setPage(1);
      }
      setMessageType("success");
      setModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error: any) {
      setFormError(
        error.response?.data?.error?.message || "บันทึกข้อมูลไม่สำเร็จ",
      );
    }
  }

  async function toggleUserStatus(user: User) {
    const nextStatus = !user.isActive;
    const action = nextStatus ? "เปิดใช้งาน" : "ระงับ";
    if (!window.confirm(`ยืนยัน${action}บัญชี ${user.fullName} หรือไม่?`))
      return;

    try {
      await api.patch(`/users/${user.id}/status`, { isActive: nextStatus });
      setMessage(`เปลี่ยนสถานะบัญชี ${user.fullName} แล้ว`);
      setMessageType("success");
      setRefreshKey((value) => value + 1);
    } catch (error: any) {
      setMessageType("error");
      setMessage(
        error.response?.data?.error?.message || "เปลี่ยนสถานะบัญชีไม่สำเร็จ",
      );
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`ลบบัญชี ${user.fullName} อย่างถาวรหรือไม่?`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      setMessage(`ลบบัญชี ${user.fullName} แล้ว`);
      setMessageType("success");
      if (items.length === 1 && page > 1) setPage((value) => value - 1);
      else setRefreshKey((value) => value + 1);
    } catch (error: any) {
      setMessageType("error");
      setMessage(error.response?.data?.error?.message || "ลบบัญชีไม่สำเร็จ");
    }
  }

  return (
    <section className="content">
      <PageHeader
        title="ผู้ใช้งาน"
        subtitle="เพิ่ม แก้ไขสิทธิ์ และจัดการสถานะบัญชีผู้ใช้งานระบบ"
        action={
          <button className="button primary" onClick={openCreateModal}>
            <Plus size={16} /> เพิ่มผู้ใช้งาน
          </button>
        }
      />
      <div className="panel form-panel">
        <div className="user-toolbar">
          <label className="searchbox">
            <Search size={17} />
            <input
              placeholder="ค้นหาชื่อหรืออีเมล"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="กรองตามสิทธิ์"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกสิทธิ์</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="STAFF">เจ้าหน้าที่</option>
          </select>
          <select
            aria-label="กรองตามสถานะ"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ระงับ</option>
          </select>
          <span className="user-result-count">ทั้งหมด {total} บัญชี</span>
        </div>
        {message && (
          <div
            className={`alert ${messageType === "error" ? "error" : "info"}`}
          >
            {message}
          </div>
        )}
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
                <th>สถานะ</th>
                <th>วันที่เพิ่ม</th>
                <th>อัปเดตล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="users-state-cell">
                    กำลังโหลดรายชื่อผู้ใช้งาน…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-name-cell">
                        <span className="avatar">
                          {user.fullName.slice(0, 1)}
                        </span>
                        <b>{user.fullName}</b>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-label ${user.role.toLowerCase()}`}>
                        {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`user-state ${user.isActive ? "active" : "inactive"}`}
                      >
                        <i /> {user.isActive ? "ใช้งาน" : "ระงับ"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "medium",
                          }).format(new Date(user.createdAt))
                        : "—"}
                    </td>
                    <td>
                      {user.updatedAt
                        ? new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "medium",
                          }).format(new Date(user.updatedAt))
                        : "—"}
                    </td>
                    <td>
                      <div className="user-actions">
                        <button
                          className="icon-action"
                          title="แก้ไขข้อมูลและรหัสผ่าน"
                          aria-label={`แก้ไข ${user.fullName}`}
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-action"
                          title={
                            user.isActive ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"
                          }
                          aria-label={`${user.isActive ? "ระงับ" : "เปิดใช้งาน"} ${user.fullName}`}
                          onClick={() => void toggleUserStatus(user)}
                        >
                          {user.isActive ? (
                            <ShieldOff size={15} />
                          ) : (
                            <ShieldCheck size={15} />
                          )}
                        </button>
                        <button
                          className="icon-action danger"
                          title="ลบบัญชี"
                          aria-label={`ลบ ${user.fullName}`}
                          onClick={() => void deleteUser(user)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="users-state-cell">
                    ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <span>
            หน้า {page} จาก {pageCount}
          </span>
          <div>
            <button
              className="button outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ก่อนหน้า
            </button>
            <button
              className="button outline"
              disabled={page >= pageCount || isLoading}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">USER MANAGEMENT</div>
                <h2 id="user-modal-title">
                  {editingUser ? "แก้ไขบัญชีผู้ใช้" : "เพิ่มผู้ใช้งาน"}
                </h2>
              </div>
              <button
                className="icon-action"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form
              key={editingUser?.id || "new-user"}
              className="user-form"
              onSubmit={saveUser}
            >
              <label>
                ชื่อ-นามสกุล
                <input
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={150}
                  defaultValue={editingUser?.fullName || ""}
                  autoFocus
                />
              </label>
              <label>
                อีเมล
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={150}
                  defaultValue={editingUser?.email || ""}
                />
              </label>
              <label>
                สิทธิ์การใช้งาน
                <select name="role" defaultValue={editingUser?.role || "STAFF"}>
                  <option value="STAFF">เจ้าหน้าที่ (Staff)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </label>
              <label>
                {editingUser
                  ? "ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                  : "รหัสผ่านเริ่มต้น"}
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  required={!editingUser}
                  autoComplete="new-password"
                  placeholder={
                    editingUser
                      ? "อย่างน้อย 10 ตัวอักษร"
                      : "อย่างน้อย 10 ตัวอักษร"
                  }
                />
              </label>
              <label className="user-active-toggle">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={editingUser?.isActive ?? true}
                />
                เปิดใช้งานบัญชี
              </label>
              {formError && <div className="alert error">{formError}</div>}
              <div className="modal-actions">
                <button
                  className="button outline"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button className="button primary" type="submit">
                  {editingUser ? "บันทึกการแก้ไข" : "สร้างบัญชี"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
function CategoriesPage({ user }: { user: User }) {
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const canManageCategories = user.role === "ADMIN";
  const filteredItems = items.filter((category) =>
    `${category.name} ${category.description || ""}`
      .toLocaleLowerCase("th")
      .includes(search.trim().toLocaleLowerCase("th")),
  );

  const load = async () => {
    try {
      const response = await api.get("/categories");
      setItems(response.data.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error?.message || "โหลดหมวดหมู่ไม่สำเร็จ",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  function openCreateModal() {
    setEditingCategory(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormError("");
    setModalOpen(true);
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCategories || isSaving) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    if (!name) {
      setMessage("กรุณากรอกชื่อหมวดหมู่");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const payload = {
        name,
        description: description || null,
      };
      if (editingCategory) {
        const response = await api.put(
          `/categories/${editingCategory.id}`,
          payload,
        );
        const updated = response.data.data as Category;
        setItems((current) =>
          current
            .map((category) =>
              category.id === updated.id
                ? { ...category, ...updated }
                : category,
            )
            .sort((a, b) => a.name.localeCompare(b.name, "th")),
        );
        setMessage("บันทึกการแก้ไขหมวดหมู่แล้ว");
      } else {
        const response = await api.post("/categories", payload);
        const created = response.data.data as Category;
        setItems((current) =>
          [...current, { ...created, _count: { assessments: 0 } }].sort(
            (a, b) => a.name.localeCompare(b.name, "th"),
          ),
        );
        setMessage("เพิ่มหมวดหมู่แล้ว");
      }
      setMessageType("success");
      setModalOpen(false);
    } catch (error: any) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.error?.message;
      setFormError(
        status === 401
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"
          : status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์เพิ่มหมวดหมู่ กรุณาเข้าสู่ระบบด้วยบัญชี Admin"
            : status === 409
              ? serverMessage || "หมวดหมู่นี้มีอยู่แล้ว"
              : !error.response
                ? "เชื่อมต่อระบบไม่ได้ กรุณาตรวจว่า backend กำลังทำงานอยู่"
                : serverMessage || "เพิ่มหมวดหมู่ไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`ลบหมวดหมู่ “${category.name}” หรือไม่?`)) return;
    try {
      await api.delete(`/categories/${category.id}`);
      setItems((current) => current.filter((item) => item.id !== category.id));
      setMessage(`ลบหมวดหมู่ “${category.name}” แล้ว`);
      setMessageType("success");
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || "ลบหมวดหมู่ไม่สำเร็จ");
      setMessageType("error");
    }
  }

  return (
    <section className="content">
      <PageHeader
        title="หมวดหมู่"
        subtitle="จัดกลุ่มแบบประเมินให้ค้นหาและรายงานได้ง่าย"
        action={
          canManageCategories ? (
            <button className="button primary" onClick={openCreateModal}>
              <Plus size={17} /> เพิ่มหมวดหมู่
            </button>
          ) : undefined
        }
      />
      <div className="panel form-panel">
        {!canManageCategories && (
          <div className="alert info">
            หน้านี้ใช้จัดการหมวดหมู่ ผู้ดูแลระบบ (Admin)
            เท่านั้นที่เพิ่มหรือแก้ไขได้
          </div>
        )}
        <div className="user-toolbar">
          <label className="searchbox">
            <Search size={18} />
            <input
              placeholder="ค้นหาชื่อหรือคำอธิบายหมวดหมู่"
              aria-label="ค้นหาหมวดหมู่"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <span className="user-result-count">
            ทั้งหมด {items.length} หมวดหมู่
          </span>
        </div>
        {message && (
          <div
            className={`alert ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}
        <div className="table-wrap">
          <table className="category-table">
            <thead>
              <tr>
                <th>ชื่อหมวดหมู่</th>
                <th>คำอธิบาย</th>
                <th>แบบประเมิน</th>
                {canManageCategories && <th>จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canManageCategories ? 4 : 3}
                    className="users-state-cell"
                  >
                    กำลังโหลดหมวดหมู่…
                  </td>
                </tr>
              ) : filteredItems.length ? (
                filteredItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="category-name-cell">
                        <span className="category-symbol">
                          <FolderKanban size={17} />
                        </span>
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td className="category-description">
                      {c.description || "—"}
                    </td>
                    <td>{c._count?.assessments || 0} รายการ</td>
                    {canManageCategories && (
                      <td>
                        <div className="user-actions">
                          <button
                            className="icon-action"
                            title="แก้ไขหมวดหมู่"
                            aria-label={`แก้ไขหมวดหมู่ ${c.name}`}
                            onClick={() => openEditModal(c)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-action danger"
                            title="ลบหมวดหมู่"
                            aria-label={`ลบหมวดหมู่ ${c.name}`}
                            onClick={() => void deleteCategory(c)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={canManageCategories ? 4 : 3}
                    className="users-state-cell"
                  >
                    {search ? "ไม่พบหมวดหมู่ตามคำค้น" : "ยังไม่มีหมวดหมู่"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving)
              setModalOpen(false);
          }}
        >
          <section
            className="user-modal category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">CATEGORY MANAGEMENT</div>
                <h2 id="category-modal-title">
                  {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
                </h2>
              </div>
              <button
                className="icon-action"
                type="button"
                aria-label="ปิดหน้าต่าง"
                disabled={isSaving}
                onClick={() => setModalOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <form
              key={editingCategory?.id || "new-category"}
              className="user-form"
              onSubmit={saveCategory}
            >
              <label>
                ชื่อหมวดหมู่
                <input
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={editingCategory?.name || ""}
                  placeholder="เช่น การให้บริการและสิ่งอำนวยความสะดวก"
                  autoFocus
                  disabled={isSaving}
                />
              </label>
              <label>
                คำอธิบาย
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingCategory?.description || ""}
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  disabled={isSaving}
                />
              </label>
              {formError && <div className="alert error">{formError}</div>}
              <div className="modal-actions">
                <button
                  className="button outline"
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "กำลังบันทึก…"
                    : editingCategory
                      ? "บันทึกการแก้ไข"
                      : "เพิ่มหมวดหมู่"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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
            <div className="stat-grid report-stat-grid">
              <div className="stat-card">
                <div className="stat-icon blue">
                  <Users size={18} />
                </div>
                <div className="stat-title">ผู้ตอบทั้งหมด</div>
                <div className="stat-value">
                  {data.summary.total}
                  <small>คน</small>
                </div>
                <div className="stat-foot">จำนวนคำตอบของแบบประเมินนี้</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <ShieldCheck size={18} />
                </div>
                <div className="stat-title">ผู้ตอบภายใน</div>
                <div className="stat-value">
                  {data.summary.internal}
                  <small>คน</small>
                </div>
                <div className="stat-foot">บุคลากรภายในหน่วยงาน</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Users size={18} />
                </div>
                <div className="stat-title">ผู้ตอบภายนอก</div>
                <div className="stat-value">
                  {data.summary.external}
                  <small>คน</small>
                </div>
                <div className="stat-foot">ผู้รับบริการภายนอก</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">
                  <Activity size={18} />
                </div>
                <div className="stat-title">คะแนนเฉลี่ย</div>
                <div className="stat-value">
                  {data.summary.average == null
                    ? "—"
                    : data.summary.average.toFixed(2)}
                  <small>/ 5</small>
                </div>
                <div className="stat-foot">คำนวณจากคำถามแบบให้คะแนน</div>
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
