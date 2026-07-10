import { Request } from "express";

export const isAdmin = (req: Request): boolean => {
  return req.user?.roles.includes(process.env.ADMIN_GROUP_ID!) ?? false;
};
