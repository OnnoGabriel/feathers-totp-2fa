import { BadRequest } from "@feathersjs/errors";
import { authenticator } from "@otplib/v12-adapter";


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
