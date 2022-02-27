export type User = {
  id: string;
  email: string;
  base32secret: string;
};

export interface TotpOptions {
  usersService: string;
  secretFieldName: string;
  requiredFieldName: string;
  applicationName: string;
}

export interface QrImageSecret {
  qr: string;
  secret: string;
}

export interface VerifyResult {
  boolean;
}
