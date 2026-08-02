export interface ExportPayload {
  title: string;
  subtitle?: string;
  insights: string[];
  modelPerformance?: {label: string; value: string}[];
  imageData?: string;
}

let _payload: ExportPayload | null = null;

export function setExportPayload(p: ExportPayload) {
  _payload = p
}

export function getExportPayload(): ExportPayload | null {
    return _payload;
}
