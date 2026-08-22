import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-calendar";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");
  const error = searchParams.get("error");

  let userId = "";
  let returnUrl = "/patient";

  if (stateStr) {
    try {
      const stateObj = JSON.parse(stateStr);
      userId = stateObj.userId;
      returnUrl = stateObj.returnUrl || "/patient";
    } catch {
      // ignore
    }
  }

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`${returnUrl}?gcal_status=error&msg=${encodeURIComponent(error || "No code received")}`, req.url)
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return NextResponse.redirect(
        new URL(`${returnUrl}?gcal_status=keys_missing`, req.url)
      );
    }

    const { tokens } = await oauth2Client.getToken(code);

    if (userId && tokens.refresh_token) {
      await db.user.update({
        where: { id: userId },
        data: { googleRefreshToken: tokens.refresh_token },
      });
    }

    return NextResponse.redirect(
      new URL(`${returnUrl}?gcal_status=connected`, req.url)
    );
  } catch (err: any) {
    console.error("[CareLoop Google Calendar Callback] Error:", err);
    return NextResponse.redirect(
      new URL(`${returnUrl}?gcal_status=error&msg=${encodeURIComponent(err?.message || "Token exchange failed")}`, req.url)
    );
  }
}
