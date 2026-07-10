export interface DeviceLocation {
    ip: string;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    region: string | null;
    country: string | null;
    timezone: string | null;
  }