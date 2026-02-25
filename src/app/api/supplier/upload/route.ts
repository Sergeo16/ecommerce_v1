import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadFile } from '@/lib/s3';

const PUBLISHER_ROLES = ['SUPPLIER', 'SUPER_ADMIN', 'AFFILIATE'] as const;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), '.uploads');

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'file';
}

/** Fallback : enregistrement local si S3 non configuré ou en erreur */
async function uploadToLocal(
  userId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, userId);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${filename}`;
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, buffer);
  return `/api/uploads/${userId}/${safeName}`;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !PUBLISHER_ROLES.includes(role as (typeof PUBLISHER_ROLES)[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const type = (formData.get('type') as string) || 'image'; // 'image' | 'video'

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: type === 'video' ? 'video_too_large' : 'image_too_large' },
      { status: 400 }
    );
  }

  const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
  const contentType = file.type;
  if (type === 'video') {
    if (!allowedVideos.includes(contentType)) {
      return NextResponse.json({ error: 'invalid_video_type' }, { status: 400 });
    }
  } else {
    if (!allowedImages.includes(contentType)) {
      return NextResponse.json({ error: 'invalid_image_type' }, { status: 400 });
    }
  }

  const filename = sanitizeFilename(file.name);
  const key = `uploads/${userId}/${Date.now()}-${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadFile(key, buffer, contentType);
    return NextResponse.json({ url });
  } catch (err) {
    console.warn('S3 upload failed, using local fallback:', err);
    try {
      const url = await uploadToLocal(userId, filename, buffer, contentType);
      return NextResponse.json({ url });
    } catch (localErr) {
      console.error('Local upload error:', localErr);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
  }
}
