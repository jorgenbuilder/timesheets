interface TimeObject {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export function convertMilliseconds(milliseconds: number): TimeObject {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  const remainingMilliseconds = milliseconds % 1000;

  return {
    hours,
    minutes: remainingMinutes,
    seconds: remainingSeconds,
    milliseconds: remainingMilliseconds,
  };
}
