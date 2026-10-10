import Router from "koa-router";
import { Client } from "@shared/types";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User } from "@server/models";
import type { APIContext, AppContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import { getTeamFromContext } from "@server/utils/passport";
import { hashPassword, verifyPassword } from "@server/utils/password";
import * as T from "./schema";

const router = new Router();

/** Constant digest used when the account is missing, to keep verify timing similar. */
const DUMMY_DIGEST = hashPassword("outline-password-dummy");

/**
 * Renders a minimal email/password sign-in page.
 *
 * @param notice optional error notice to display.
 * @returns html document body.
 */
function renderLoginPage(notice?: string): string {
  const message =
    notice === "auth-error"
      ? "Invalid email or password."
      : notice === "user-suspended"
        ? "This account has been suspended."
        : notice
          ? "Unable to sign in."
          : "";

  return `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in – Outline</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; }
      main { max-width: 360px; margin: 12vh auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
      h1 { font-size: 1.25rem; margin: 0 0 8px; }
      p { color: #666; font-size: .9rem; }
      label { display: block; margin: 16px 0 6px; font-size: .85rem; }
      input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; }
      button { width: 100%; margin-top: 20px; padding: 12px; border: 0; border-radius: 8px; background: #111; color: #fff; font-size: 1rem; cursor: pointer; }
      .error { color: #b00020; margin-top: 12px; }
      a { color: #555; font-size: .85rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Password sign-in</h1>
      <p>Use the admin email and password for this workspace.</p>
      <form method="POST" action="/auth/password">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="username" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required />
        <button type="submit">Sign in</button>
      </form>
      ${message ? `<p class="error">${message}</p>` : ""}
      <p style="margin-top:20px"><a href="/">← Back</a></p>
    </main>
  </body>
</html>`;
}

router.get("password", async (ctx: AppContext) => {
  const notice = typeof ctx.query.notice === "string" ? ctx.query.notice : undefined;
  ctx.type = "html";
  ctx.body = renderLoginPage(notice);
});

router.post(
  "password",
  rateLimiter(RateLimiterStrategy.FiftyPerHour),
  validate(T.PasswordSchema),
  async (ctx: APIContext<T.PasswordReq>) => {
    const { email, password } = ctx.input.body;
    const team = await getTeamFromContext(ctx, { includeOAuthState: false });

    if (!team) {
      ctx.redirect("/auth/password?notice=auth-error");
      return;
    }

    const user = await User.scope("withTeam").findOne({
      where: {
        teamId: team.id,
        email: email.toLowerCase(),
      },
    });

    const digest = user?.passwordDigest ?? DUMMY_DIGEST;
    const matches = verifyPassword(password, digest);
    if (!user?.passwordDigest || !matches) {
      ctx.redirect("/auth/password?notice=auth-error");
      return;
    }

    if (user.isSuspended) {
      ctx.redirect("/auth/password?notice=user-suspended");
      return;
    }

    await signIn(ctx, "password", {
      user,
      team: user.team,
      isNewTeam: false,
      isNewUser: false,
      client: Client.Web,
    });
  }
);

export default router;
