import { BadRequest } from "@feathersjs/errors";
import { checkContext } from "feathers-hooks-common";
import type { HookContext } from "@feathersjs/feathers";

import getQrCodeSecret from "../utils/get-qr-code-secret";
import verifyToken from "../utils/verify-token";
import { defaultOptions } from "../options";

import type { TotpOptions } from "../types";

/**
 * TOTP 2FA Hook
 *
 * To be called in the after hook of the create method in the authentication service
 */
export default function totp2fa(
  options?: TotpOptions
): (context: HookContext) => HookContext {
  return async (context: HookContext): HookContext => {
    options = Object.assign(defaultOptions, options);

    // Only run in the after hook of the create method
    checkContext(context, "after", ["create"], "totp2fa");

    const { app, data, result } = context;

    // Only run if login via local strategy
    if (!data || !result || data.strategy !== "local") {
      return context;
    }

    // Only run with authenticated users
    const { user } = result;
    if (!user) {
      return context;
    }

    // Only run with if Totp 2FA is required for this user
    if (
      user[options.requiredFieldName] !== undefined &&
      !user[options.requiredFieldName]
    ) {
      return context;
    }

    // Return QR code and secret?
    if (!data.token && !data.secret && !user[options.secretFieldName]) {
      context.result = await getQrCodeSecret(app, user, options);
      return context;
    }

    // Save secret to user data?
    if (data.secret) {
      if (!data.token) {
        throw new BadRequest("Token required.");
      }
      if (!verifyToken(data.token, data.secret)) {
        throw new BadRequest("Invalid token.");
      }

      if (!user[options.secretFieldName]) {
        const patchData = {};
        patchData[options.secretFieldName] = data.secret;

        await app.service("users").patch(user.id, patchData);
      } else {
        throw new BadRequest("Secret already saved.");
      }
      return context;
    }

    // Verify token?
    if (data.token) {
      if (!verifyToken(data.token, user[options.secretFieldName])) {
        throw new BadRequest("Invalid token.");
      }
    } else {
      throw new BadRequest("Token required.");
    }

    // Remove secret from result.user
    delete context.result.user[options.secretFieldName];

    return context;
  };
}
