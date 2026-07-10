const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const rawOrigins =
    process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000";
  const allowedOrigins = rawOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (process.env.NODE_ENV !== "test") {
    console.log("[cors] Allowed browser origins:", allowedOrigins.join(", ") || "(none)");
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalized)) {
          return callback(null, normalized);
        }
        if (process.env.DEBUG_CORS === "1") {
          console.warn("[cors] Blocked origin:", normalized, "allowed:", allowedOrigins);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
      optionsSuccessStatus: 204,
    })
  );
  app.use(express.json());
  // Accept HTML form posts / Postman x-www-form-urlencoded payloads (common during manual testing).
  app.use(express.urlencoded({ extended: true }));
  // PA-V2-B41: async report exports POST JSON payloads.
  app.use(cookieParser());

  app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
      fallthrough: true,
      index: false,
    })
  );

  app.use("/api", apiRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
