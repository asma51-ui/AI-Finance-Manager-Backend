require("dotenv").config();
const { createApp } = require("./app");
const { connectDb, attachMongoErrorLogging } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  attachMongoErrorLogging();
  await connectDb(process.env.MONGODB_URI);

  try {
    const { bootstrapQdrant } = require("./services/qdrantBootstrap.service");
    const out = await bootstrapQdrant();
    if (out?.skipped) {
      console.log("[qdrant] bootstrap skipped (DISABLE_QDRANT_BOOTSTRAP=1)");
    } else {
      console.log(
        `[qdrant] bootstrap ok: collection=${out.name} created=${Boolean(out.created)}`
      );
    }
  } catch (e) {
    console.error("[qdrant] bootstrap failed:", e.message || e);
    // Keep server runnable even if Qdrant is down; vector chat can fall back until fixed.
  }

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[backend] Server listening on http://localhost:${PORT}`);
    const { startRecurringScheduler } = require("./jobs/recurring.cron");
    const { startGoalDeadlineReminderScheduler } = require("./jobs/goalReminder.cron");
    const { startBudgetRolloverScheduler } = require("./jobs/budgetRollover.cron");
    const { startReportExportScheduler } = require("./jobs/reportExport.worker");
    const { startNotificationRetentionScheduler } = require("./jobs/notificationRetention.cron");
    const { startApprovalEscalationScheduler } = require("./jobs/approvalEscalation.cron");
    const { startRagEmbeddingScheduler } = require("./jobs/ragEmbedding.cron");
    startRecurringScheduler();
    startGoalDeadlineReminderScheduler();
    startBudgetRolloverScheduler();
    startReportExportScheduler();
    startNotificationRetentionScheduler();
    startApprovalEscalationScheduler();
    startRagEmbeddingScheduler();
  });
}

start().catch((err) => {
  console.error("[backend] Failed to start:", err);
  if (err?.name === "MongooseServerSelectionError") {
    console.error(
      "[backend] Hint: details above list each Atlas node; fix IP allowlist, credentials, VPN/firewall, or cluster pause."
    );
  }
  process.exit(1);
});
