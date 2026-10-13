export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param path The destination path (e.g., {user_id}/{capture_id}/{filename.ext})
   * @param file The file Blob/Buffer/ArrayBuffer
   * @param mimeType The file MIME type
   * @returns The saved storage path
   */
  uploadFile(
    path: string,
    file: Blob | Buffer | ArrayBuffer,
    mimeType: string,
  ): Promise<string>;

  /**
   * Generates a short-lived signed URL for secure retrieval.
   * @param path The storage path of the file
   * @param expiresInSeconds Duration until the URL expires
   * @returns The signed URL
   */
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes a file from the storage provider.
   * @param path The storage path of the file
   */
  deleteFile(path: string): Promise<void>;
}
