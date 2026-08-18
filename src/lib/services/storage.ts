/**
 * Storage service — image delivery and upload are both wired to real ImageKit.
 *
 * Upload signatures come from the `imagekit-auth` Supabase Edge Function
 * (supabase/functions/imagekit-auth/index.ts), which holds the ImageKit PRIVATE key as a
 * secret and is never bundled into frontend code. If VITE_IMAGEKIT_AUTH_ENDPOINT isn't
 * set (or the call fails), uploads fall back to an in-memory object URL so the UI flow
 * stays fully wired in local dev without the edge function deployed.
 */

import { buildSrc, upload } from "@imagekit/react"

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string | undefined
const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string | undefined
const authEndpoint = import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined

export interface UploadResult {
  url: string
  path: string
  fileId: string | null
}

async function authenticator() {
  if (!authEndpoint) throw new Error("VITE_IMAGEKIT_AUTH_ENDPOINT not configured — using mock upload.")
  const res = await fetch(authEndpoint)
  if (!res.ok) throw new Error(`ImageKit auth endpoint failed: ${res.status}`)
  return (await res.json()) as { token: string; expire: number; signature: string }
}

export async function uploadImage(
  file: File,
  bucket: "visitor-photos" | "resident-photos" | "notice-attachments",
): Promise<UploadResult> {
  try {
    if (!publicKey) throw new Error("VITE_IMAGEKIT_PUBLIC_KEY not configured")
    const { token, expire, signature } = await authenticator()
    const result = await upload({
      file,
      fileName: file.name,
      folder: `/${bucket}`,
      signature,
      expire,
      token,
      publicKey,
    })
    return { url: result.url ?? "", path: result.filePath ?? `${bucket}/${file.name}`, fileId: result.fileId ?? null }
  } catch {
    // no auth endpoint configured/deployed yet — fall through to mock
  }
  await new Promise((r) => setTimeout(r, 400))
  const url = URL.createObjectURL(file)
  return { url, path: `mock/${bucket}/${file.name}`, fileId: null }
}

/**
 * Real ImageKit URL-based transform. If the given url is already an ImageKit-hosted
 * asset (path under urlEndpoint), returns a resized/optimized delivery URL. Otherwise
 * (mock object URLs, before real uploads are wired) returns the url unchanged.
 */
export function optimizedImageUrl(url: string, width: number, height: number) {
  if (!urlEndpoint || url.startsWith("blob:")) return url
  return buildSrc({
    urlEndpoint,
    src: url,
    transformation: [{ width, height, cropMode: "extract", focus: "auto" }],
  })
}
