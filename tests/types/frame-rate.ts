import { Stage } from "../../src/index";

export function frameRateTypes() {
  const stage = new Stage({ frameRate: 30 });
  stage.frameRate = 60;
  stage.frameRate = "auto";
  const rate: number | "auto" = stage.frameRate;
  // @ts-expect-error Only numeric rates or "auto" are supported.
  stage.frameRate = "30fps";
  return rate;
}
