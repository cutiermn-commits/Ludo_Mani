// Web: the browser downloads the file locally. Nothing is uploaded.
export async function readPhotoAsDataUri(uri: string): Promise<string | null> {
  return uri.startsWith('data:') ? uri : null;
}

export async function shareExport(json: string, fileName: string): Promise<boolean> {
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
