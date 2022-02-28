import { authenticator } from "otplib";
import qrcode from "qrcode";

import type { Application } from "@feathersjs/feathers";
import type { User, TotpOptions, QrImageSecret } from "../types";

export default async function getQrCodeSecret(
  app: Application,
  user: User,
  options: TotpOptions
): Promise<QrImageSecret> {
  // Get secret (base32 encoded)
  const secret = user[options.secretFieldName]
    ? user[options.secretFieldName]
    : authenticator.generateSecret();

  // Generate URL
  const otpauth = authenticator.keyuri(
    user.email,
    options.applicationName,
    secret
  );

  // Generate QR code with secret url
  const qrImage = await qrcode.toDataURL(otpauth);

  return { qr: qrImage, secret };
}
