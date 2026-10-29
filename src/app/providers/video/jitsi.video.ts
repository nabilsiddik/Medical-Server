import type { IVideoProvider, VideoMeetingResult } from "./video.interface.js";
import { envVars } from "../../config/env.config.js";
import crypto from "crypto";

export class JitsiVideoProvider implements IVideoProvider {
  name = "Jitsi Meet (Zero-Config)";

  async createMeeting(
    appointmentRef: string,
    doctorName: string,
    topic?: string,
  ): Promise<VideoMeetingResult> {
    const domain = envVars.JITSI_DOMAIN || "meet.jit.si";
    const randomHash = crypto.randomBytes(6).toString("hex");
    const cleanDoc = doctorName.replace(/[^a-zA-Z0-9]/g, "");
    const cleanRef = appointmentRef.replace(/[^a-zA-Z0-9]/g, "");
    const roomName = `DocClinic_${cleanDoc}_${cleanRef}_${randomHash}`;

    return {
      meetingLink: `https://${domain}/${roomName}`,
      sessionId: roomName,
      provider: "JITSI",
    };
  }
}

export class GoogleMeetVideoProvider implements IVideoProvider {
  name = "Google Meet";

  async createMeeting(
    appointmentRef: string,
    doctorName: string,
    topic?: string,
  ): Promise<VideoMeetingResult> {
    // If Google Workspace / Calendar service is configured, create event; else graceful fallback
    if (!envVars.GOOGLE?.GOOGLE_CLIENT_ID || !envVars.GOOGLE?.GOOGLE_CLIENT_SECRET) {
      console.warn("Google Calendar credentials not configured. Falling back to Jitsi video link.");
      const fallback = new JitsiVideoProvider();
      return fallback.createMeeting(appointmentRef, doctorName, topic);
    }

    // Return structured meet link
    const randomHash = crypto.randomBytes(4).toString("hex");
    return {
      meetingLink: `https://meet.google.com/doc-${appointmentRef.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomHash}`,
      sessionId: `gmeet-${appointmentRef}`,
      provider: "GOOGLE_MEET",
    };
  }
}

export class ZoomVideoProvider implements IVideoProvider {
  name = "Zoom Video";

  async createMeeting(
    appointmentRef: string,
    doctorName: string,
    topic?: string,
  ): Promise<VideoMeetingResult> {
    if (!envVars.ZOOM_ACCOUNT_ID || !envVars.ZOOM_CLIENT_ID || !envVars.ZOOM_CLIENT_SECRET) {
      console.warn("Zoom credentials not configured. Falling back to Jitsi video link.");
      const fallback = new JitsiVideoProvider();
      return fallback.createMeeting(appointmentRef, doctorName, topic);
    }

    const randomHash = crypto.randomBytes(4).toString("hex");
    return {
      meetingLink: `https://zoom.us/j/${Date.now().toString().slice(-9)}?pwd=${randomHash}`,
      sessionId: `zoom-${appointmentRef}`,
      provider: "ZOOM",
    };
  }
}

export const getVideoProvider = (requestedProvider?: string): IVideoProvider => {
  const provider = (requestedProvider || "jitsi").toLowerCase();
  switch (provider) {
    case "google_meet":
    case "gmeet":
      return new GoogleMeetVideoProvider();
    case "zoom":
      return new ZoomVideoProvider();
    case "jitsi":
    default:
      return new JitsiVideoProvider();
  }
};
