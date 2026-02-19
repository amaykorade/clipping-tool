import { NextRequest, NextResponse } from 'next/server'
import { getStorage, isS3Storage } from '@/lib/storage'
import path from 'path'

/**
 * Parse Range header (e.g. "bytes=0-1023" or "bytes=0-")
 */
function parseRange(rangeHeader: string | null, totalLength: number): { start: number; end: number } | null {
  if (!rangeHeader?.startsWith('bytes=')) return null
  const parts = rangeHeader.slice(6).trim().split('-')
  const start = parts[0] ? parseInt(parts[0], 10) : 0
  const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1
  if (Number.isNaN(start) || start > end || end >= totalLength) return null
  return { start, end }
}

/**
 * GET /upload/clips/.../file.mp4 (and other uploaded files)
 * For S3: redirects to presigned URL. For local: serves with Range support.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const storage = getStorage()

    const exists = await storage.exists(filePath)
    if (!exists) {
      return new NextResponse('File not found', { status: 404 })
    }

    if (isS3Storage(storage)) {
      const signedUrl = await storage.getPresignedGetUrl(filePath)
      return NextResponse.redirect(signedUrl, { status: 302 })
    }

    const buffer = await storage.download(filePath)
    const totalLength = buffer.length

    const ext = path.extname(filePath).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    }
    const contentType = contentTypeMap[ext] || 'application/octet-stream'

    const range = parseRange(request.headers.get('range'), totalLength)

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    }

    if (range) {
      const { start, end } = range
      const chunk = buffer.subarray(start, end + 1)
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${totalLength}`,
          'Content-Length': String(chunk.length),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
          ...corsHeaders,
        },
      })
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('[Upload] Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  })
}
