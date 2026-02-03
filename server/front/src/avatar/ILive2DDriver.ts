import type { MotionPriority } from "./types";

export interface ILive2DDriver {
  load(modelUrl: string): Promise<void>;
  unload(): void;
  setExpression(expression: string | null): void;
  triggerMotion(motion: string | null, priority: MotionPriority): void;
  setParameter(id: string, value: number): void;
  dispose(): void;
}
