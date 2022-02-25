import { authenticator } from "otplib";
import { BadRequest } from "@feathersjs/errors";

import type { VerifyResult } from "../types";

export default function verifyToken(
  userToken: string,
  secret: string
): boolean {
  if (!userToken) {
    throw new BadRequest("No token.");
  }
  if (!secret) {
    throw new BadRequest("No secret.");
  }

  return authenticator.verify({ token: userToken, secret });
}
