import { describe, expect, it } from "vitest";
import { accountCookieProblem } from "./invitations";

const value = "zastraeachastity%7C1795300049%7Ctoken%7Chmac";
const named = `wordpress_logged_in_9f99da61dffa6001609cc00c032a1dac=${value}`;

describe("accountCookieProblem", () => {
  it("asks for a cookie when nothing is pasted", () => {
    expect(accountCookieProblem("   ")).toMatch(/paste/i);
  });

  it("rejects a bare value", () => {
    expect(accountCookieProblem(value)).toMatch(/wordpress_logged_in_/);
  });

  it("rejects another account-site cookie", () => {
    expect(
      accountCookieProblem(`wordpress_sec_9f99da61dffa6001609cc00c032a1dac=${value}`),
    ).toMatch(/wordpress_logged_in_/);
  });

  it("accepts the named cookie with or without a Cookie prefix", () => {
    expect(accountCookieProblem(named)).toBe("");
    expect(accountCookieProblem(`Cookie: ${named}`)).toBe("");
  });

  it("accepts a Cookie header that includes it", () => {
    expect(
      accountCookieProblem(
        `wordpress_test_cookie=WP%20Cookie%20check; ${named}; wordpress_sec_abc=${value}`,
      ),
    ).toBe("");
  });
});
