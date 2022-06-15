import assert from "assert";
import { authenticator } from "otplib";
import feathers, { Application } from "@feathersjs/feathers";
import { Service } from "feathers-memory";
import crypto from "crypto";

import totp2fa from "../../src/hooks/totp2fa";

describe("totp2fa.test.ts", function () {
  let app: Application;
  let context;

  // Setup encryption method for saving encrypted secrets
  const algorithm = "aes-256-ctr";
  const secretKey = crypto.randomBytes(32);
  const secretIv = crypto.randomBytes(16);

  const encrypt = (text: string) => {
    const cipher = crypto.createCipheriv(algorithm, secretKey, secretIv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return encrypted.toString("hex");
  };

  const decrypt = (hash: string) => {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, secretIv);
    const decrpyted = Buffer.concat([
      decipher.update(Buffer.from(hash, "hex")),
      decipher.final(),
    ]);

    return decrpyted.toString();
  };

  const cryptoUtil = {
    encrypt,
    decrypt,
  };

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
    assert.strictEqual(user.totp2faSecret, context.data.secret);
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

  it("does not overwrite existing secret.", async () => {
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
    assert.strictEqual(user.totp2faSecret, context.data.secret);

    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "BadRequest");
      assert.strictEqual(err.message, "Secret already saved.");

      return true;
    });
  });

  it("validates token.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    await app.service("users").patch(context.result.user.id, {
      totp2faSecret: secret,
    });

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      token: token,
    };

    const resultContext = await totp2fa()(context);
    assert(
      "accessToken" in resultContext.result && "user" in resultContext.result
    );
  });

  it("does not validate token.", async () => {
    const secret = authenticator.generateSecret();

    await app.service("users").patch(context.result.user.id, {
      totp2faSecret: secret,
    });

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      token: "xxxx",
    };

    await assert.rejects(totp2fa()(context), (err: any) => {
      assert.strictEqual(err.name, "BadRequest");
      assert.strictEqual(err.message, "Invalid token.");
      return true;
    });
  });

  it("saves encrypted secret.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      secret: secret,
      token: token,
    };

    await totp2fa({
      cryptoUtil: cryptoUtil,
    })(context);

    const user = await app.service("users").get("1234");

    assert.strictEqual(
      user.totp2faSecret,
      cryptoUtil.encrypt(context.data.secret)
    );
  });

  it("validates token with encrypted secret.", async () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);

    await app.service("users").patch(context.result.user.id, {
      totp2faSecret: cryptoUtil.encrypt(secret),
    });

    context.data = {
      strategy: "local",
      email: context.data.email,
      password: context.data.password,
      token: token,
    };

    const resultContext = await totp2fa({
      cryptoUtil: cryptoUtil,
    })(context);

    assert(
      "accessToken" in resultContext.result && "user" in resultContext.result
    );
  });
});
