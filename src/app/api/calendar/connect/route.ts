import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const returnUrl = role === "DOCTOR" ? "/doctor" : "/patient";

  const authUrl = getGoogleAuthUrl(userId, returnUrl);

  if (!authUrl) {
    // If OAuth keys aren't set in .env, redirect back with friendly notice
    return NextResponse.redirect(
      new URL(`${returnUrl}?gcal_status=keys_missing`, req.url)
    );
  }

  return NextResponse.redirect(authUrl);
}
