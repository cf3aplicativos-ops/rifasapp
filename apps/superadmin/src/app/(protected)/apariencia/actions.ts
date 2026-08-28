"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { setLoginBackgroundUrl } from "@rifaxapp/db-control";
import { requireSuperAdmin } from "@/lib/require-superadmin";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export type GuardarFondoState = { error: string } | { success: true } | undefined;

// Solo http(s) — evita "javascript:"/"data:" u otros esquemas raros en un
// campo que termina como `background-image: url(...)` (ver AuthShell).
function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function guardarFondoUrl(
  _prevState: GuardarFondoState,
  formData: FormData,
): Promise<GuardarFondoState> {
  await requireSuperAdmin();

  const url = String(formData.get("backgroundUrl") ?? "").trim();

  if (!isValidHttpUrl(url)) {
    return { error: "Ingresá una URL válida (http:// o https://)." };
  }

  await setLoginBackgroundUrl(url);

  revalidatePath("/apariencia");
  return { success: true };
}

export async function subirFondoArchivo(
  _prevState: GuardarFondoState,
  formData: FormData,
): Promise<GuardarFondoState> {
  await requireSuperAdmin();

  const file = formData.get("backgroundFile");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí un archivo de imagen." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: "La imagen no puede pesar más de 5MB." };
  }

  const blob = await put(`login-background/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await setLoginBackgroundUrl(blob.url);

  revalidatePath("/apariencia");
  return { success: true };
}

export async function quitarFondo(): Promise<void> {
  await requireSuperAdmin();
  await setLoginBackgroundUrl(null);
  revalidatePath("/apariencia");
}
