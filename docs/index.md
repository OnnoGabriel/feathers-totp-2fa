# Usage

To use this package, you should be familiar with the concept of TOTP two-factor authentication in general.

This package can easily integrated and configured in a Feathers application with [Local Authentication](https://docs.feathersjs.com/api/authentication/local.html) strategy enabled. The TOTP 2FA is added as an additional step (hook) to the normal authentication.

The setup requires the addition of a single hook to the authentication service, the extension of the users model in the backend and some additional implementations in the frontend ("login page"). All steps are described in detail in the following.

## Backend Implementation

Just add the `topt2fa` hook of this package to the _after_ hooks of the `create` method in the `authentication` service, e.g.:

```js
const {
  AuthenticationService,
  JWTStrategy,
} = require("@feathersjs/authentication");
const { LocalStrategy } = require("@feathersjs/authentication-local");
const { expressOauth } = require("@feathersjs/authentication-oauth");

const { topt2fa } = require("feathers-totp-2fa").hooks;

module.exports = (app) => {
  const authentication = new AuthenticationService(app);

  authentication.register("jwt", new JWTStrategy());
  authentication.register("local", new LocalStrategy());

  app.use("/authentication", authentication);
  app.configure(expressOauth());

  // TOPT 2FA Hook
  app.service("authentication").hooks({
    after: {
      create: [topt2fa()],
    },
  });
};
```

To configure be behavior of the `topt2fa` hook it can be invoked with the following options:

- `usersService`: the name of the users service (default: `users`),

- `secretFieldName`: the name of the field in the user model to store the TOTP secret (default: `totp2faSecret`),

- `requiredFieldName`: the name of the field in the user model which indicate if 2FA is required for this user ( default: `totp2faRequired`),

- `applicationName`: the name of the application, which will be shown in the Authenticator app (default: `Feathers App`).

For example:

```js
 // TOPT 2FA Hook
app.service("authentication").hooks({
    after: {
      create: [topt2fa({
          usersService: "users",
          secretFieldName: "totp2faSecret",
          requiredFieldName: "totp2faRequired",
          applicationName: "My Feathers App"
      })],
    },
  });
};
```

The `users` model of your app has to be extended with the following fields:

- `totp2faSecret`(String): will contain the TOTP secret,

- `totp2faRequired`(Boolean): if true, the user has to use TOTP 2FA to login. This field is optional. If not used, all users have to use TOTP 2FA.

(If you have changed the field names in the configuration of the hook, use your own field names here.)

## Frontend Implementation and Process Flow

There are two phases:

1. **Setup up phase:** The creation of a TOTP secret and its storage in the database and in an Athenticator app.

2. **Operation phase:** The validation of a TOTP token in the login process.

### Setup up phase

Initially, a TOTP secret has to be generated in the Feathers app, send to the frontend together with a QR code, where the user can scan the QR code with an Authenticator app on a smartphone/table. The necessary steps are shown in the following figure and are described below:

![Test](images/process_flow_initial.png)

#### 1. Frontend posts local sign-in

The setup phase starts with the frontend sending a normal sign-in request to the Feathers app, for example:

```json
{
  "strategy": "local",
  "email": "user@example.com",
  "password": "password"
}
```

Feathers will authenticate the user, i. e. generate a JWT and add it to the response object. After this, the `topt2fa` hook will check if TOTP is required for this user and if so, it will check if a TOTP secret has already been stored in the user data. If there is already a secret, the hook will trigger an 403 error `Token required.`, and the frontend has to ask the user for this token (see next chapter). Otherwise it will generate the secret:

#### 2. Creation of secret and QR code

The `topt2fa` hook generates a TOTP secret and a QR code image containing the auth path with this secret and adds it to the response to the client/frontend:

```json
{
  "secret": "[TOTP secret]",
  "qr": "[QR code image base64 encoded]"
}
```

The next steps have to be implemented in your frontend:

#### 3. User scans the QR code with the app

The frontend ("login page") analyses the response. If it contains the secret and QR code, the frontend shows the QR code, which is just a base64 encoded image.

#### 4. App saves the secret

The app saves the secret and presents a token to the user. The user types the token in an input field in the frontend, e.g. just below the normal login fields.

#### 5. Fronted posts secret and token

The frontend sends the secret together with the token back to the authentication service in the Feathers app. The request body contains also the normal authentication:

```json
{
  "strategy": "local",
  "email": "user@example.com",
  "password": "password",
  "secret": "[TOTP secret]",
  "token": "[TOTP token]"
}
```

The `topt2fa` hook verifies the token and stores the secret in the user data.

#### 6. Response with JWT

Finally, the backend responses with the normal JWT.

### Operation phase

In normal operation, the user will login and add additionally the TOTP token, which is shown in the Authenticator app.

The frontend may send the credentials together with the TOTP token to the Feathers authentication servce. Or it sends first the normal credentials, receives an `Token required.` error and send in a second step credentials together with the TOTP token. The latter approach may be used when 2FA is not for all users required and entering of the TOTP token is optional. This more complicated process flow is described in the following:

![Test](images/process_flow.png)

#### 1. Frontend posts local sign-in

The frontend sends a normal sign-in request to the Feathers app, for example:

```json
{
  "strategy": "local",
  "email": "user@example.com",
  "password": "password"
}
```

Feathers will authenticate the user, i. e. generate a JWT and add it to the response object. After this, the `topt2fa` hook checks if TOTP is required for this user and if so, it will check if a TOTP secret has already been stored in the user data. If so, it will check if a valid token is part of the frontend request.

#### 2. Response with missing token error

If the token is missing, the hook will trigger a `Token required.` error. Otherwise the hook will continue with the final step 6.

#### 3. User opens Authenticator app

The frontend should ask the user to enter a valid token from the Authenticator app. The login form has to be extended with an input field for this token.

#### 4. Authenticator app shows token

The user enters the token from the app.

#### 5. Frontend posts credentials and token

The frontend sends the normal credentials together with the TOTP token to the Feathers authentication service:

```json
{
  "strategy": "local",
  "email": "user@example.com",
  "password": "password",
  "token": "[TOTP token]"
}
```

#### 6. Response with JWT

Finally, the backend responses with the normal JWT.
