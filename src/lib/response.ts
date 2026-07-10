import { Response } from "express";

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error: any = null,
) => {
  // Mapping error agar propertinya bisa dibaca oleh JSON.stringify
  let errorData = error;

  if (error instanceof Error) {
    errorData = {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };
  }

  const response: ApiResponse = {
    success: false,
    message,
    // Gunakan errorData yang sudah di-mapping
    error: process.env.NODE_ENV === "development" ? errorData : undefined,
  };

  return res.status(statusCode).json(response);
};
