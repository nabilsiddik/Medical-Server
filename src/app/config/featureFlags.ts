import type { Request, Response, NextFunction } from "express";
import AppError from "../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";

export interface FeatureFlags {
  onlinePayments: boolean;
  videoConsultation: boolean;
  aiChatbot: boolean;
  aiScribe: boolean;
  whatsappChannel: boolean;
  dentalChart: boolean;
  smartRecall: boolean;
  reviewsPublic: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    onlinePayments: process.env.FEATURE_ONLINE_PAYMENTS === "true",
    videoConsultation: process.env.FEATURE_VIDEO !== "false", // enabled by default with Jitsi
    aiChatbot: process.env.FEATURE_AI_CHATBOT === "true",
    aiScribe: process.env.FEATURE_AI_SCRIBE === "true",
    whatsappChannel: process.env.FEATURE_WHATSAPP === "true",
    dentalChart: process.env.FEATURE_DENTAL_CHART === "true",
    smartRecall: process.env.FEATURE_SMART_RECALL !== "false",
    reviewsPublic: process.env.FEATURE_REVIEWS !== "false",
  };
};

export const requireFeature = (featureName: keyof FeatureFlags) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const flags = getFeatureFlags();
    if (!flags[featureName]) {
      return next(
        new AppError(
          StatusCodes.NOT_FOUND,
          `The requested feature "${String(featureName)}" is not enabled for this practice.`,
        ),
      );
    }
    next();
  };
};
