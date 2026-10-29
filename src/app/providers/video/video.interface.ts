export interface VideoMeetingResult {
  meetingLink: string;
  sessionId?: string;
  provider: string;
  password?: string;
}

export interface IVideoProvider {
  name: string;
  createMeeting(
    appointmentRef: string,
    doctorName: string,
    topic?: string,
  ): Promise<VideoMeetingResult>;
}
