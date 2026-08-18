import { useEffect, useRef, useState } from "react"
import { Camera, RotateCcw, X, AlertCircle, ImageUp } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * Live camera preview + capture, using getUserMedia — not a file-picker
 * (mobile browsers only force the camera app for `<input capture>`, and
 * desktop browsers just open a gallery picker; this gives a real live
 * preview + shutter on every platform that has a camera).
 */
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fallbackFileRef = useRef<HTMLInputElement>(null)

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      setError(null)
      setReady(false)
      stopStream()

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser doesn't support camera access. Choose a photo file instead.")
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setReady(true)
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ""
        if (name === "NotAllowedError") {
          setError("Camera permission denied. Allow camera access, or choose a photo file instead.")
        } else if (name === "NotFoundError") {
          setError("No camera found on this device. Choose a photo file instead.")
        } else {
          setError("Couldn't start the camera. Choose a photo file instead.")
        }
      }
    }

    function stopStream() {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [facingMode])

  function capture() {
    const video = videoRef.current
    if (!video || !ready) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], `visitor-${Date.now()}.jpg`, { type: "image/jpeg" }))
      },
      "image/jpeg",
      0.9,
    )
  }

  function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onCapture(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-chrome-950">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-white">Take visitor photo</span>
        <button type="button" onClick={onClose} aria-label="Close camera" className="rounded-full bg-white/10 p-2 text-white">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-chrome-950 p-6 text-center">
            <AlertCircle size={28} className="text-rust-500" />
            <p className="text-sm text-white/90">{error}</p>
            <Button type="button" variant="secondary" onClick={() => fallbackFileRef.current?.click()}>
              <ImageUp size={16} /> Choose a photo file
            </Button>
          </div>
        )}
      </div>

      <input ref={fallbackFileRef} type="file" accept="image/*" className="hidden" onChange={handleFallbackFile} />

      {!error && (
        <div className="flex items-center justify-center gap-8 p-6">
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            aria-label="Switch camera"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            aria-label="Capture photo"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-chrome-950 disabled:opacity-50"
          >
            <Camera size={28} />
          </button>
          <div className="h-12 w-12" />
        </div>
      )}
    </div>
  )
}
