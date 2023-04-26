import { describe, it, expect } from "vitest";
import { convertMilliseconds } from "./time";

describe("convertMilliseconds function", () => {
  it("should convert milliseconds to hours, minutes, seconds, and milliseconds", () => {
    const milliseconds = 123456789;
    const expectedTimeObject = {
      hours: 34,
      minutes: 17,
      seconds: 36,
      milliseconds: 789,
    };

    const result = convertMilliseconds(milliseconds);

    expect(result).toEqual(expectedTimeObject);
  });

  it("should return an object with all values set to 0 if the input is 0", () => {
    const milliseconds = 0;
    const expectedTimeObject = {
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };

    const result = convertMilliseconds(milliseconds);

    expect(result).toEqual(expectedTimeObject);
  });
});
