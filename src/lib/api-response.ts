import { NextResponse } from "next/server";

export function apiError(message: string, status: number = 400) {
  return NextResponse.json(
    { error: { message, status } },
    { status }
  );
}

export function apiSuccess(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}
