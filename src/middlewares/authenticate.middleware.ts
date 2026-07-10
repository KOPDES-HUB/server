import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "../lib/response";
import { UserPayload } from "../types/user";

export const authenticate = (req: Request, res: any, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string,
    ) as UserPayload;

    req.user = decoded;

    return next();
  } catch (err) {
    return errorResponse(
      res,
      "Unauthorized: invalid or expired token",
      401,
      err,
    );
  }
};
