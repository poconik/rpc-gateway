export interface LogEntry {
  level: number;
  time: string;
  event: string;
  msg: string;
  requestId?: string;
  apiKey?: string;
  url?: string;
  headers?: string;
}
