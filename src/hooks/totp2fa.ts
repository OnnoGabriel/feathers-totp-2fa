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

    const usersService = app.service(options.usersService);
    const usersServiceId = usersService.id;

    // Only run if login via local strategy
    if (!data || !result || data.strategy !== "local") {
      return context;
    }

    // Only run with authenticated users
    let { user } = result;

    try {
      user = await usersService._get(user[usersServiceId]);
    } catch (err) {
      throw new BadRequest("User not found.");
    }

    if (!user) {
      return context;
    }

    // Only run if Totp 2FA is required for this user
    if (
      user[options.requiredFieldName] !== undefined &&
      !user[options.requiredFieldName]
    ) {
      return context;
    }

    // Return QR code and secret?
    if (!data.token && !data.secret && !user[options.secretFieldName]) {
      context.result = {
        data: await getQrCodeSecret(app, user, options),
      };
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
        const crypto = options.cryptoUtil;
        patchData[options.secretFieldName] = crypto && crypto.encrypt ? crypto.encrypt(data.secret) : data.secret;
        try {
          await usersService._patch(user[usersServiceId], patchData);
        } catch (err) {
          throw new BadRequest("Could not save secret.");
        }
      } else {
        throw new BadRequest("Secret already saved.");
      }

      return context;
    }

    // Verify token?
    if (data.token) {
      const crypto = options.cryptoUtil;
      const secret = crypto && crypto.decrypt ? crypto.decrypt(user[options.secretFieldName]) : user[options.secretFieldName];
      if (!verifyToken(data.token, secret)) {
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
