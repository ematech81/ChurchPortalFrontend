import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** A file produced by the API (exports come back as base64 so they can travel in JSON). */
export interface ExportFile {
  filename: string;
  mimeType: string;
  base64: string;
}

const UTI: Record<string, string> = {
  xlsx: 'org.openxmlformats.spreadsheetml.sheet',
  csv: 'public.comma-separated-values-text',
  vcf: 'public.vcard',
  txt: 'public.plain-text',
};

/** Writes the file to the app cache and opens the system share sheet (WhatsApp, Drive, email, Excel…). */
export async function saveAndShare(file: ExportFile): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${file.filename}`;
  await FileSystem.writeAsStringAsync(uri, file.base64, { encoding: FileSystem.EncodingType.Base64 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const ext = file.filename.split('.').pop()?.toLowerCase() ?? '';
  await Sharing.shareAsync(uri, {
    mimeType: file.mimeType.split(';')[0],
    dialogTitle: file.filename,
    UTI: UTI[ext],
  });
}
