export interface UploadResult {
  url: string;
  key: string;
  size?: number;
  mimeType?: string;
}

export interface IStorageProvider {
  name: string;
  uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
