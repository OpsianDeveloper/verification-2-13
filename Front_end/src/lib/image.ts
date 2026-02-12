/**
 * Image optimization utilities for client-side compression and resizing
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<OptimizeImageOptions> = {
  maxWidth: 1280,
  quality: 0.82,
};

const MAX_BASE64_SIZE = 800 * 1024; // 800KB

/**
 * Optimizes an image data URL by resizing and compressing
 * @param dataUrl - The original image data URL
 * @param options - Optimization options (maxWidth, quality)
 * @returns Promise resolving to optimized data URL
 */
export async function optimizeImageDataUrl(
  dataUrl: string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  const { maxWidth, quality } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions preserving aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with specified quality
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(optimizedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for optimization"));
    };

    img.src = dataUrl;
  });
}

/**
 * Gets the base64 size in bytes (excluding data URI prefix)
 */
export function getBase64Size(dataUrl: string): number {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  // Base64 encodes 3 bytes as 4 characters
  return Math.round((base64.length * 3) / 4);
}

export interface OptimizeSuccessResult {
  success: true;
  dataUrl: string;
  sizeBytes: number;
}

export interface OptimizeErrorResult {
  success: false;
  errorMessage: string;
}

export type OptimizeImageResult = OptimizeSuccessResult | OptimizeErrorResult;

/**
 * Optimizes an image with size guardrails and automatic retry
 * @param dataUrl - The original image data URL
 * @returns Promise resolving to optimization result with success/failure
 */
export async function optimizeImageWithGuardrails(
  dataUrl: string
): Promise<OptimizeImageResult> {
  console.log("[Image] Starting optimization...");

  try {
    // First attempt: quality 0.82
    let optimized = await optimizeImageDataUrl(dataUrl, { quality: 0.82 });
    let size = getBase64Size(optimized);
    console.log(`[Image] First pass: ${Math.round(size / 1024)}KB`);

    if (size <= MAX_BASE64_SIZE) {
      return { success: true, dataUrl: optimized, sizeBytes: size };
    }

    // Retry with lower quality: 0.75
    console.log("[Image] Size exceeds 800KB, retrying with quality 0.75...");
    optimized = await optimizeImageDataUrl(dataUrl, { quality: 0.75 });
    size = getBase64Size(optimized);
    console.log(`[Image] Second pass: ${Math.round(size / 1024)}KB`);

    if (size <= MAX_BASE64_SIZE) {
      return { success: true, dataUrl: optimized, sizeBytes: size };
    }

    // Still too large
    console.log("[Image] Image still too large after optimization");
    return {
      success: false,
      errorMessage: "Image too large, please retake",
    };
  } catch (error) {
    console.error("[Image] Optimization failed:", error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Failed to optimize image",
    };
  }
}
