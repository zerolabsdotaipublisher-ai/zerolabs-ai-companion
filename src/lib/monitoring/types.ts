export type MonitoringEvent = {
  event: string;
  route: string;
  metric: string;
  timestamp: string;
  durationMs?: number;
  value?: number;
  statusCode?: number;
};

export type MonitoringEventInput = Omit<MonitoringEvent, "timestamp"> & {
  timestamp?: string;
};
