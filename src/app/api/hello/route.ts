import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      message: "Hello! The API is up and running.",
      timestamp,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}