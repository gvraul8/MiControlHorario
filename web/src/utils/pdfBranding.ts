export const PDF_APP_ICON_PATH = '/icon.png';
export const PDF_AUTHOR_ICON_PATH = '/gvraul-icon.png';
export const PDF_AUTHOR_HANDLE = 'gvraul';

export async function loadImageAsDataUrl(path: string): Promise<string> {
  const url = path.startsWith('http') ? path : new URL(path, window.location.origin).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen: ${path}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Error al leer la imagen: ${path}`));
    reader.readAsDataURL(blob);
  });
}

export async function loadPdfBrandingImages(): Promise<{ appIcon: string; authorIcon: string }> {
  const [appIcon, authorIcon] = await Promise.all([
    loadImageAsDataUrl(PDF_APP_ICON_PATH),
    loadImageAsDataUrl(PDF_AUTHOR_ICON_PATH),
  ]);
  return { appIcon, authorIcon };
}
