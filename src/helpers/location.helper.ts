import axios from "axios";
import { DeviceLocation } from "../types/location";

export async function getLocationByIp(
  ip: string
): Promise<DeviceLocation> {
  try {
    const { data } = await axios.get(
      `https://ipwho.is/${ip}`
    );

    return {
      ip,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      timezone: data.timezone?.id ?? null,
    };
  } catch {
    return {
      ip,
      latitude: null,
      longitude: null,
      city: null,
      region: null,
      country: null,
      timezone: null,
    };
  }
}