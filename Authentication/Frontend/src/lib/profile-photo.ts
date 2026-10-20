import { processIdPhotoFile, type PreparedIdPhoto } from './id-photo-processor';

export type PreparedProfilePhoto = PreparedIdPhoto;

/** Face-aware ID photo processing for staff avatars and card photos. */
export async function prepareProfilePhoto(file: File): Promise<PreparedProfilePhoto> {
  return processIdPhotoFile(file);
}
