export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { readDb } from '@/lib/store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const db = readDb();
  const request = db.requests.find((r) => r.id === params.id);
  if (!request || !request.videoFile) {
    return new Response('Not found', { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'data', 'videos', request.videoFile);
  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const stream = fs.createReadStream(filePath, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': 'video/webm',
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'video/webm',
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
    },
  });
}
