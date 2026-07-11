import express from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queues/emailQueue";

import authRoute from "../src/routes/auth.route";
import permissionRoute from "../src/routes/permission.route";
import menuRoute from "../src/routes/menu.route";
import roleRoute from "../src/routes/role.route";
import userRoute from "../src/routes/user.route";
import projectRoute from "../src/routes/project.route";
import assignmentRoute from "../src/routes/assignment.route";
import myTaskRoute from "../src/routes/myTask.route";
import notificationRoute from "../src/routes/notification.route";
import dashboardRoute from "../src/routes/dashboard.route";
import activityRoute from "../src/routes/activity.route";
import employeeActivityRoute from "../src/routes/employeeActivity.route";
import leaveRoute from "../src/routes/leave.route";
import telegramRoute from "../src/routes/telegram.route";
import applicationInfoRoute from "../src/routes/applicationInfo.route";
import TelegramController from "./controllers/telegram.controller";
import { startTelegramBot } from "./services/telegramBot";

import anggotaKoperasiRoute from "../src/routes/anggotaKoperasi.route";
import karyawanKoperasiRoute from "../src/routes/karyawanKoperasi.route";
import pengurusKoperasiRoute from "../src/routes/pengurusKoperasi.route";
import ratKoperasiRoute from "../src/routes/ratKoperasi.route";
import referensiKoperasiWilayahRoute from "../src/routes/referensiKoperasiWilayah.route";
import referensiWilayahRoute from "../src/routes/referensiWilayah.route";
import simpananAnggotaRoute from "../src/routes/simpananAnggota.route";
import profilKoperasiRoute from "../src/routes/profilKoperasi.route";
import transaksiPenjualanRoute from "../src/routes/transaksiPenjualan.route";
import koperasiRoute from "../src/routes/koperasi.route";

import { authenticate } from "./middlewares/authenticate.middleware";
import path from "path";

// Aplikasi express
const app = express();

// Bull Board Dashboard (Mounted before Helmet to avoid CSP blocking)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          ...(process.env.ALLOWED_ORIGINS?.split(",") || []),
        ],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 10000 : 1000,
});
app.use(limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // #region agent log
    fetch("http://127.0.0.1:7591/ingest/e37e4eb2-1953-4214-a75b-ed7e54685425", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6f6c76" },
      body: JSON.stringify({
        sessionId: "6f6c76",
        hypothesisId: "A",
        location: "server.ts:cors",
        message: "cors origin check",
        data: {
          origin: origin ?? null,
          allowedOrigins,
          allowed: !origin || allowedOrigins.includes(origin),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    // allow REST client / server-to-server (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-internal-token"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRoute);
app.post("/api/telegram/webhook", TelegramController.webhook);
app.use("/api/permissions", authenticate, permissionRoute);
app.use("/api/menus", authenticate, menuRoute);
app.use("/api/roles", authenticate, roleRoute);
app.use("/api/users", authenticate, userRoute);
app.use("/api/projects", authenticate, projectRoute);
app.use("/api/assignments", authenticate, assignmentRoute);
app.use("/api/my-tasks", authenticate, myTaskRoute);
app.use("/api/notifications", authenticate, notificationRoute);
app.use("/api/dashboard", authenticate, dashboardRoute);
app.use("/api/my-activities", authenticate, activityRoute);
app.use("/api/employee-activities", authenticate, employeeActivityRoute);
app.use("/api/leaves", authenticate, leaveRoute);
app.use("/api/telegram", authenticate, telegramRoute);
app.use("/api/application-info", authenticate, applicationInfoRoute);

app.use("/api/anggota-koperasi", authenticate, anggotaKoperasiRoute);
app.use("/api/karyawan-koperasi", authenticate, karyawanKoperasiRoute);
app.use("/api/pengurus-koperasi", authenticate, pengurusKoperasiRoute);
app.use("/api/rat-koperasi", authenticate, ratKoperasiRoute);
app.use(
  "/api/referensi-koperasi-wilayah",
  authenticate,
  referensiKoperasiWilayahRoute,
);
app.use("/api/referensi-wilayah", authenticate, referensiWilayahRoute);
app.use("/api/simpanan-anggota", authenticate, simpananAnggotaRoute);
app.use("/api/profil-koperasi", profilKoperasiRoute);
app.use("/api/koperasi", authenticate, koperasiRoute);
// app.use("/api/transaksi-penjualan", authenticate, transaksiPenjualanRoute);
app.use("/api/transaksi-penjualan", authenticate, transaksiPenjualanRoute);

app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve("uploads"), {
    maxAge: 31536000000, // 1 tahun dalam milidetik (365 hari)
    immutable: true,
  }),
);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  startTelegramBot();
});
