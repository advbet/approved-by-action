import { expect, test } from "@jest/globals";
import * as core from "@actions/core";
import { Approvals, getApprovals, getBodyWithApprovedBy, Reviews } from "../src/approved-by";

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

jest.spyOn(core, "info").mockImplementation(() => {
  return;
});
jest.spyOn(core, "debug").mockImplementation(() => {
  return;
});

describe("getting approvals from reviews", () => {
  test("2 approvals from different users", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
      {
        user: { id: 2, login: "test2" },
        state: "APPROVED",
      },
    ];
    expect(getApprovals(reviews as Reviews)).toStrictEqual([
      { username: "test2" },
      { username: "test1" },
    ]);
  });

  test("1 approval, 1 dismiss from different users", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
      {
        user: { id: 2, login: "test2" },
        state: "DISMISSED",
      },
    ];
    expect(getApprovals(reviews as Reviews)).toStrictEqual([{ username: "test1" }]);
  });

  test("no reviews", () => {
    const reviews: RecursivePartial<Reviews> = [];
    expect(getApprovals(reviews as Reviews)).toStrictEqual([]);
  });
});

describe("setting Approved-by", () => {
  test("null body", () => {
    const body = null;
    const approvals: RecursivePartial<Approvals> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, approvals as Approvals)).toBe("\n\nApproved-by: test1");
  });

  test("existing body without Approved-by", () => {
    const body = "Test";
    const approvals: RecursivePartial<Approvals> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, approvals as Approvals)).toBe("Test\n\nApproved-by: test1");
  });

  test("existing body with Approved-by", () => {
    const body = "Test\n\nApproved-by: test2";
    const approvals: RecursivePartial<Approvals> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, approvals as Approvals)).toBe("Test\n\nApproved-by: test1");
  });
});
