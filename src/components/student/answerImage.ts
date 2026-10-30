const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 128 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Store a bounded, self-contained raster image so saved answers survive reloads.
export async function prepareAnswerImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.has(file.type))
    throw new Error("JPG, PNG, WebP 이미지를 선택해주세요.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("이미지는 10MB 이하로 선택해주세요.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "이미지를 처리할 수 없습니다. 다른 이미지를 선택해주세요.",
      );
    for (let attempt = 0; attempt < 8; attempt += 1) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const source = canvas.toDataURL(
        "image/webp",
        Math.max(0.5, 0.85 - attempt * 0.05),
      );
      if (source.length * 0.75 <= MAX_IMAGE_BYTES) return source;
      canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
    }
    throw new Error("이미지 용량이 큽니다. 크기가 작은 이미지를 선택해주세요.");
  } finally {
    bitmap.close();
  }
}
