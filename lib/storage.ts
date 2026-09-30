import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface StorageAdapter {
  storeImage(file: File): Promise<string>;
}

export class LocalStorageAdapter implements StorageAdapter {
  async storeImage(file: File) {
    if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Only JPG, PNG, and WebP images are supported.');
    }

    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new Error('The uploaded file is not a supported image.');
    }

    const format = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const output = await image.resize({ width: 1600, withoutEnlargement: true }).toFormat(metadata.format).toBuffer();
    const fileName = `${randomUUID()}.${format}`;
    const uploadDirectory = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, fileName), output, { flag: 'wx' });
    return `/uploads/${fileName}`;
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();