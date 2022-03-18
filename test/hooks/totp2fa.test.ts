import assert from "assert";
import { authenticator } from "otplib";
import feathers, { Application } from "@feathersjs/feathers";
import { Service } from "feathers-memory";

import totp2fa from "../../src/hooks/totp2fa";

describe("totp2fa.test.ts", function () {
  let app: Application;
  let context;

  beforeEach(async () => {
    app = feathers();
    app.use("/users", new Service());
    app.setup();

    const user = {
      id: "1234",
      email: "user@example.com",
      password: "12345678",
    };

    context = {
      app,
      type: "after",
      method: "create",
      data: {
        strategy: "local",
        email: user.email,
        password: user.password,
      },
      result: {
        accessToken: "1234",
        user,
      },
      params: { user },
    };

    await app.service("users").create(user);
  });

  it("throws if not called in before hook.", async () => {
    context.type = "before";
    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "Error");
      assert.strictEqual(
        err.message,
        "The 'totp2fa' hook can only be used as a 'after' hook."
      );
      return true;
    });
  });

  it("throws if not called in create method.", async () => {
    context.method = "find";
    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "Error");
      assert.strictEqual(
        err.message,
        "The 'totp2fa' hook can only be used on the '[\"create\"]' service method(s)."
      );
      return true;
    });
  });

  it("returns QR code and secret.", async () => {
    const resultContext = await totp2fa()(context);
    assert(
      "data" in resultContext.result &&
        "qr" in resultContext.result.data &&
        "secret" in resultContext.result.data
    );
  });

  it("saves secret if correct token is given.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      secret: secret,
      token: token,
    };
    await totp2fa()(context);

    const user = await app.service("users").get("1234");
    assert.ok(user.totp2faSecret, context.data.secret);
  });

  it("does not save secret if incorrect token is given.", async () => {
    const secret = authenticator.generateSecret();

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      secret: secret,
      token: "xxxx",
    };

    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "BadRequest");
      assert.strictEqual(err.message, "Invalid token.");
      return true;
    });
  });

  it("does not save secret again.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      secret: secret,
      token: token,
    };

    await totp2fa()(context);

    const user = await app.service("users").get("1234");
    assert.ok(user.totp2faSecret, context.data.secret);

    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "BadRequest");
      assert.strictEqual(err.message, "Secret already saved.");

      return true;
    });
  });

  it("validates token.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      token: token,
    };

    await app.service("users").patch(context.result.user.id, {
      totp2faSecret: secret,
    });

    const resultContext = await totp2fa()(context);
    assert(
      "accessToken" in resultContext.result && "user" in resultContext.result
    );
  });

  it("does not validate token.", async () => {
    const secret = authenticator.generateSecret();

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      token: "xxxx",
    };

    await app.service("users").patch(context.result.user.id, {
      totp2faSecret: secret,
    });

    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "BadRequest");
      assert.strictEqual(err.message, "Invalid token.");
      return true;
    });
  });
});
