import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("accepts the password that was hashed", () => {
    const digest = hashPassword("correct-horse");

    expect(verifyPassword("correct-horse", digest)).toBe(true);
  });

  it("rejects a different password", () => {
    const digest = hashPassword("correct-horse");

    expect(verifyPassword("wrong-horse", digest)).toBe(false);
  });

  it("rejects a malformed digest", () => {
    expect(verifyPassword("correct-horse", "not-a-digest")).toBe(false);
  });
});
