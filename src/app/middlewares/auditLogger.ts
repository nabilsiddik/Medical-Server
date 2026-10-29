import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";

export const logAudit = async (params: {
  actorId?: string | undefined;
  action: string;
  entity: string;
  entityId?: string | undefined;
  details?: any;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
};

export const auditMiddleware = (action: string, entity: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Record audit asynchronously without blocking request
    const actorId = req.user?.id ? String(req.user.id) : undefined;
    const forwarded = req.headers["x-forwarded-for"];
    const ipAddress = req.ip || (typeof forwarded === "string" ? forwarded : Array.isArray(forwarded) ? forwarded[0] : undefined);
    const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]) : undefined;
    const entityId = req.params?.id ? String(req.params.id) : undefined;

    logAudit({
      actorId,
      action,
      entity,
      entityId,
      ipAddress,
      userAgent,
      details: {
        method: req.method,
        path: req.originalUrl,
      },
    }).catch(() => {});

    next();
  };
};
