import { expect, test } from "@jest/globals";
import * as core from "@actions/core";

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
}

jest.spyOn(core, "info").mockImplementation(() => {
    return;
});
jest.spyOn(core, "debug").mockImplementation(() => {
    return;
});

test("pass", () => {
    expect(1).toBe(1);
});
