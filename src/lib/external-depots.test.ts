import { describe, expect, it } from "vitest";
import { isOfficialOrangeSms } from "./external-depots";

describe("isOfficialOrangeSms", () => {
  it("accepts an official Orange Money receipt", () => {
    expect(isOfficialOrangeSms("Vous avez recu 1000 Ar du 0321234567. Nouveau solde: 5000 Ar. Trans Id: PP231103.1234.A12345")).toBe(true);
  });
  it("rejects a fake text without balance and reference", () => {
    expect(isOfficialOrangeSms("Vous avez recu 10000 Ar du 0321234567")).toBe(false);
  });
  it("rejects a message starting with a personal number", () => {
    expect(isOfficialOrangeSms("0341234567 Vous avez recu 1000 Ar. Nouveau solde: 5000 Ar. Ref: PP12345678")).toBe(false);
  });
});
