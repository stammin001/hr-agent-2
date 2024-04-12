import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    console.log("Hello, world!");

    return NextResponse.json({"message": "Hello, world!"});
}