# feathers-totp-2fa

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)

> Simple two-factor authentication for Feathers using time-based one-time passwords (TOTP) _aka_ "Authenticator app".

This package provides a [Feathers](https://docs.feathersjs.com/) hook, which adds TOTP two-factor authentication (2FA) functionality to the authentication process. Secret generation and token verification is performed using the [otplib](https://github.com/yeojz/otplib) library.

The current version is tested with the [Local Authentication](https://docs.feathersjs.com/api/authentication/local.html) strategy of Feathers and with Microsoft's and Google's Authenticator apps.

## Installation

> This package is still **work in progress!** It is not recommended to use it in production.

```bash
npm i feathers-totp-2fa
```

## Todos (contributions welcome!)

- [✓] Add Tests,
- [✓] Make 2FA optional, e.g. by a boolean `totp2FaRequired` value in the user model,
- [✓] Add an option for the users service name,
- [✓] Add an option for the name of the `totpSecret` field name,
- [✓] Add an option for the app name (shown in Authenticator app),
- [✓] Replace `speakeasy` with `otplib`
- [ ] Add an option for the secret encoding,
- [ ] Add an option for the encryption method,
- [ ] Add an option for the expiration date of the secret (useful? TBD).

## Documentation

See the [documentation](docs/index.md) for more details about the configuration and usage of this package.

## License

Copyright (c) 2022

Licensed under the [MIT license](LICENSE).
