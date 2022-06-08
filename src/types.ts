export type User = {
  id: string;
  email: string;
  base32secret: string;
};

export interface TotpOptions {
  usersService: string;
  secretFieldName: string;
  requiredFieldName: string;
  cryptoUtil: CryptoUtil;
  applicationName: string;
}

export interface CryptoUtil {
  encrypt(text: string): string;
  decrypt(text: string): string;
}

export interface QrImageSecret {
  qr: string;
  secret: string;
}

export interface VerifyResult {
  boolean;
}
