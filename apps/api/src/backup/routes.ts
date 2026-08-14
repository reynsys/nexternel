import type { FastifyPluginAsync } from "fastify";
import { requireAdmin } from "../auth/rbac.js";
import {
  createJob,
  getJob,
  readJobFile,
  updateJob,
} from "./jobs.js";
import {
  inspectBackupFile,
  mapBackupError,
  runCreateBackupJob,
  runRestoreBackupJob,
} from "./restore-service.js";

export const backupRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Body: {
      password?: string;
      confirmPassword?: string;
      includeHistory?: boolean;
    };
  }>("/api/v1/backup/jobs", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    const password = String(request.body?.password ?? "").trim();
    const confirmPassword = String(request.body?.confirmPassword ?? "").trim();
    const includeHistory = request.body?.includeHistory !== false;

    if (!password || password.length < 8) {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "Backup password must be at least 8 characters.",
        },
      });
    }
    if (password !== confirmPassword) {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "Backup passwords do not match.",
        },
      });
    }

    const job = createJob("create");
    void runCreateBackupJob(job.id, password, includeHistory);
    return { job };
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/backup/jobs/:id",
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const job = getJob(request.params.id);
      if (!job) {
        return reply.code(404).send({
          error: { code: "not_found", message: "Backup job not found." },
        });
      }
      return { job };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/backup/jobs/:id/download",
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const job = getJob(request.params.id);
      if (!job || job.status !== "ready") {
        return reply.code(404).send({
          error: { code: "not_found", message: "Backup is not ready for download." },
        });
      }
      const buffer = readJobFile(request.params.id);
      if (!buffer) {
        return reply.code(404).send({
          error: { code: "not_found", message: "Backup file not found." },
        });
      }
      const filename = job.filename || "nexternel-backup.nexbackup";
      return reply
        .header("Content-Type", "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );

  app.post("/api/v1/backup/inspect", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      let password = "";
      let fileBuffer: Buffer | null = null;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.fieldname !== "file") {
            await part.toBuffer();
            continue;
          }
          fileBuffer = await part.toBuffer();
        } else if (part.fieldname === "password") {
          password = String(part.value ?? "");
        }
      }

      if (!fileBuffer?.length) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "Backup file is required." },
        });
      }
      if (!password) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "Backup password is required." },
        });
      }

      const result = await inspectBackupFile(fileBuffer, password);
      return result;
    } catch (err) {
      const mapped = mapBackupError(err);
      return reply.code(400).send({ error: mapped });
    }
  });

  app.post("/api/v1/backup/restore", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      let password = "";
      let confirm = "";
      let wifiSsid = "";
      let wifiPassword = "";
      let fileBuffer: Buffer | null = null;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.fieldname !== "file") {
            await part.toBuffer();
            continue;
          }
          fileBuffer = await part.toBuffer();
        } else {
          const value = String(part.value ?? "");
          if (part.fieldname === "password") password = value;
          if (part.fieldname === "confirm") confirm = value;
          if (part.fieldname === "wifiSsid") wifiSsid = value;
          if (part.fieldname === "wifiPassword") wifiPassword = value;
        }
      }

      if (!fileBuffer?.length) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "Backup file is required." },
        });
      }
      if (!password) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "Backup password is required." },
        });
      }
      if (confirm !== "RESTORE") {
        return reply.code(400).send({
          error: {
            code: "bad_request",
            message: 'Confirmation required: type RESTORE to continue.',
          },
        });
      }

      const inspect = await inspectBackupFile(fileBuffer, password);
      if (!inspect.valid) {
        const msg = inspect.blockingErrors[0] || "Invalid backup.";
        const code =
          msg.includes("password") ? "backup_password_invalid" : "backup_corrupt";
        return reply.code(400).send({ error: { code, message: msg } });
      }
      if (!inspect.compatible) {
        return reply.code(400).send({
          error: {
            code: "backup_incompatible",
            message: inspect.blockingErrors.join(" "),
          },
        });
      }

      const job = createJob("restore");
      updateJob(job.id, { status: "queued", message: "Starting restore" });
      void runRestoreBackupJob(job.id, fileBuffer, password, {
        wifiSsid: wifiSsid || undefined,
        wifiPassword: wifiPassword || undefined,
        preserveAdminUsername: request.user?.username,
      });
      return { job };
    } catch (err) {
      const mapped = mapBackupError(err);
      return reply.code(400).send({ error: mapped });
    }
  });
};
