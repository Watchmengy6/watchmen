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
  // and supports both images and videos. If that fails (plugin
  // version mismatch, install glitch, etc.) we fall back to
  // @capacitor/camera's pickImages so photo upload still works.
  if (cap?.isNativePlatform?.()) {
    // Strategy 1: FilePicker.pickMedia (photo OR video from library).
    const available =
      typeof cap.isPluginAvailable === "function"
        ? cap.isPluginAvailable("FilePicker")
        : true;
    if (available) {
      try {
        const { FilePicker } = await import(
          "@capawesome/capacitor-file-picker"
        );
        const result = await FilePicker.pickMedia({
          limit: 1,
          // readData: false → we fetch the blob ourselves from the
          // local path. Cheaper than base64 round-tripping for video.
          readData: false,
        });
        const picked = result.files?.[0];
        if (!picked) return null; // user cancelled — don't fall back

        // The native iOS bridge returns `path` as a file:// URI.
        // WKWebView fetch() can't read raw file:// URIs by default —
        // Capacitor.convertFileSrc() rewrites them to a capacitor://
        // URL that the local server can serve.
        const rawPath = (picked as any).path || (picked as any).webPath;
        if (!rawPath) {
          console.warn("[pickMedia] FilePicker returned no path");
          // Fall through to fallback strategy below.
        } else {
          const uri =
            typeof cap.convertFileSrc === "function"
              ? cap.convertFileSrc(rawPath)
              : rawPath;
          const res = await fetch(uri);
          const blob = await res.blob();
          const mime =
            picked.mimeType || blob.type || "application/octet-stream";
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
        }
      } catch (e) {
        console.warn(
          "[pickMedia] FilePicker.pickMedia failed, falling back to photo-only picker",
          e,
        );
        // Fall through to Strategy 2 — at minimum photos should still
        // work for the user even if the file picker plugin is broken.
      }
    } else {
      console.warn(
        "[pickMedia] FilePicker plugin not available — using photo-only fallback",
      );
    }

    // Strategy 2: @capacitor/camera Camera.pickImages — image only.
    // This is the same plugin pickPhotoFromLibrary uses, which we know
    // works on Aaron's device. Video gets skipped on the fallback but
    // photo upload is preserved end-to-end.
    try {
      const photo = await pickPhotoFromLibrary();
      if (!photo) return null;
      return { file: photo, mediaType: "image" };
    } catch (e) {
      console.warn("[pickMedia] photo fallback also failed", e);
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
