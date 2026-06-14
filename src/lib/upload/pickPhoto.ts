"use client";

/**
 * Library-only media pickers. Built for the iOS Capacitor wrap where
 * the default <input type="file" accept="image/*,video/*"> presents an
 * action sheet that includes "Take Photo or Video" — and Apple Review
 * June 2026 crashed the app on that camera path.
 *
 * Both helpers below bypass the camera entirely:
 *   - pickPhotoFromLibrary()  → image only, via @capacitor/camera
 *     pickImages() → PHPickerViewController on iOS.
 *   - pickMediaFromLibrary()  → photo OR video, via
 *     @capawesome/capacitor-file-picker pickMedia() → also
 *     PHPickerViewController on iOS, with video support.
 *
 * On web both fall back to a hidden <input type="file"> with the
 * appropriate accept attribute. Mobile Safari can still surface
 * "Take Photo" on the web build, but the iOS native build is what
 * Apple Review touches and that's covered.
 *
 * Both return null if the user cancels.
 */
export async function pickPhotoFromLibrary(): Promise<File | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;

  // Native path — Capacitor photo library picker, no camera option shown.
  if (cap?.isNativePlatform?.()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      const result = await Camera.pickImages({
        quality: 90,
        limit: 1,
        // Note: @capacitor/camera's pickImages() opens the system photo
        // library on iOS / Android — there is no camera button on the
        // sheet. quality 90 keeps file sizes reasonable without
        // visible compression artifacts.
      });
      const photo = result.photos?.[0];
      if (!photo?.webPath) return null;

      // Fetch the photo blob from the local file URI Capacitor returned
      // and wrap it as a File so it fits the existing upload pipeline.
      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      const ext = (photo.format || "jpg").toLowerCase();
      const filename = `photo-${Date.now()}.${ext}`;
      const type = blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      return new File([blob], filename, { type });
    } catch (e) {
      console.warn("[pickPhoto] Capacitor pickImages failed", e);
      return null;
    }
  }

  // Web path — fall back to a hidden file input.
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };
    // Some browsers fire `cancel` instead of an empty `change`; handle both.
    input.oncancel = () => {
      try {
        document.body.removeChild(input);
      } catch {}
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Pick a photo OR video from the device's library — never the camera.
 * Returns the picked file plus a discriminator the caller uses to
 * populate the `media_type` column on posts/messages.
 */
export interface PickedMedia {
  file: File;
  mediaType: "image" | "video";
}

export async function pickMediaFromLibrary(): Promise<PickedMedia | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;

  // Native path — @capawesome/capacitor-file-picker pickMedia opens
  // PHPickerViewController on iOS, which has zero camera entry points
  // and supports both images and videos.
  if (cap?.isNativePlatform?.()) {
    try {
      const { FilePicker } = await import("@capawesome/capacitor-file-picker");
      const result = await FilePicker.pickMedia({
        limit: 1,
        // readData: false → we fetch the blob ourselves from the
        // file:// path. That's cheaper than base64 round-tripping
        // for large videos.
        readData: false,
      });
      const picked = result.files?.[0];
      if (!picked) return null;

      // Resolve the local URI Capacitor returned. iOS hands back
      // either `path` (file://...) or `webPath` (capacitor://...).
      const uri = (picked as any).webPath || (picked as any).path;
      if (!uri) return null;

      const res = await fetch(uri);
      const blob = await res.blob();
      const mime = picked.mimeType || blob.type || "application/octet-stream";
      const isVideo = mime.startsWith("video/");
      const ext = (() => {
        if (picked.name && picked.name.includes(".")) {
          return picked.name.split(".").pop()!.toLowerCase();
        }
        if (isVideo) return mime.split("/")[1] || "mov";
        return mime.split("/")[1] || "jpg";
      })();
      const filename = picked.name || `media-${Date.now()}.${ext}`;
      const file = new File([blob], filename, { type: mime });
      return { file, mediaType: isVideo ? "video" : "image" };
    } catch (e) {
      console.warn("[pickMedia] Capacitor pickMedia failed", e);
      return null;
    }
  }

  // Web path — hidden file input accepting image or video.
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      if (!file) return resolve(null);
      const mediaType: "image" | "video" = file.type.startsWith("video/")
        ? "video"
        : "image";
      resolve({ file, mediaType });
    };
    input.oncancel = () => {
      try {
        document.body.removeChild(input);
      } catch {}
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}
