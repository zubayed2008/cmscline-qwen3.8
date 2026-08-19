import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standardized API response types.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: number;
  details?: unknown;
}

/**
 * Returns a success JSON response.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Returns an error JSON response.
 */
export function errorResponse(
  error: string,
  code: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error, code, details }, { status: code });
}

/**
 * Handles Zod validation errors and returns a 400 response.
 */
export function handleValidationError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return errorResponse('Validation failed', 400, details);
  }
  return errorResponse('Validation failed', 400);
}

/**
 * Handles general errors and returns an appropriate response.
 * Does not expose raw database errors to the client.
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden: Admin access required') {
      return errorResponse('Forbidden: Admin access required', 403);
    }
    // Handle Mongoose duplicate key error
    if ('code' in error && (error as { code: number }).code === 11000) {
      return errorResponse('Duplicate key error: resource already exists', 409);
    }
    // Handle Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
      return errorResponse('Invalid ID format', 400);
    }
    // Handle Mongoose validation error
    if (error.name === 'ValidationError') {
      return errorResponse('Database validation failed', 400, error.message);
    }
  }
  return errorResponse('Internal server error', 500);
}