import jwt from "jsonwebtoken";
import "dotenv/config";
import { UserPayload } from "../types/user";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (payload: UserPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "15m",
    issuer: "auth-app",
    audience: "auth-app-client",
  });
};

export const generateRefreshToken = (payload: UserPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: "7d",
    issuer: "auth-app",
    audience: "auth-app-client",
  });
};

export const verifyAccessToken = (token: string): UserPayload => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: "auth-app",
    audience: "auth-app-client",
  }) as UserPayload;
};

export const verifyRefreshToken = (token: string): UserPayload => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: "auth-app",
    audience: "auth-app-client",
  }) as UserPayload;
};
