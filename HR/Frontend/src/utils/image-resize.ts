import { processIdPhotoFile, type PreparedIdPhoto } from '../../../../packages/id-photo-browser';

export type PreparedProfilePhoto = PreparedIdPhoto;

export async function prepareProfilePhoto(file: File): Promise<PreparedProfilePhoto> {
  return processIdPhotoFile(file);
}
