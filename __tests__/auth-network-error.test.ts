import { describe, expect, it } from "vitest";
import { explainAuthFailure } from "../lib/auth-network-error";

describe("explainAuthFailure", () => {
  it("rewrites Failed to fetch into a Supabase setup hint", () => {
    const msg = explainAuthFailure(new Error("Failed to fetch"));
    expect(msg.toLowerCase()).toContain("sign-in service");
    expect(msg.toLowerCase()).toContain("supabase");
  });

  it("rewrites invalid login credentials into a Login or Sign up hint", () => {
    const msg = explainAuthFailure(new Error("Invalid login credentials"));
    expect(msg.toLowerCase()).toContain("wrong email or password");
    expect(msg.toLowerCase()).toContain("sign up");
    expect(msg.toLowerCase()).not.toContain("invalid login credentials");
  });

  it("rewrites Please login (10001) into a login hint", () => {
    const msg = explainAuthFailure(new Error("Please login (10001)"));
    expect(msg.toLowerCase()).toContain("login");
    expect(msg.toLowerCase()).toContain("email and password");
    expect(msg).not.toContain("10001");
  });

  it("rewrites unable to transfer response into a tap-check-again hint", () => {
    const msg = explainAuthFailure(new Error("Unable to transfer response from server"));
    expect(msg.toLowerCase()).toContain("check my three pictures");
    expect(msg.toLowerCase()).not.toContain("unable to transfer");
  });

  it("does not leave people stuck on User already registered", () => {
    const msg = explainAuthFailure(new Error("User already registered"));
    expect(msg.toLowerCase()).toContain("logging you in");
    expect(msg.toLowerCase()).not.toContain("user already registered");
  });

  it("rewrites Forbidden into a wait-and-check-again hint", () => {
    const msg = explainAuthFailure(new Error("Forbidden"));
    expect(msg.toLowerCase()).toContain("check this id");
    expect(msg.toLowerCase()).not.toBe("forbidden");
  });

  it("rewrites HTML-as-JSON (DOCTYPE) into a check-again hint on the live site", () => {
    const msg = explainAuthFailure(
      new Error("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"),
    );
    expect(msg.toLowerCase()).toContain("pictures");
    expect(msg.toLowerCase()).toContain("check my three pictures");
    expect(msg.toLowerCase()).not.toContain("8082");
  });
});
