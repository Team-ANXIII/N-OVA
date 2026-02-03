import * as PIXI from "pixi.js";
import type { Live2DModel as Live2DModelType } from "pixi-live2d-display/cubism4";
import type { ILive2DDriver } from "./ILive2DDriver";
import type { MotionPriority } from "./types";

export class PixiLive2DDriver implements ILive2DDriver {
  private app: PIXI.Application;
  private model: Live2DModelType | null = null;
  private resizeHandler: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    (window as any).PIXI = PIXI;

    this.app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: canvas.parentElement ?? window
    });

    this.resizeHandler = () => this.fitModel();
    window.addEventListener("resize", this.resizeHandler);

    this.app.ticker.add((delta) => {
      if (this.model && typeof (this.model as any).update === "function") {
        (this.model as any).update(delta);
      }
    });
  }

  async load(modelUrl: string): Promise<void> {
    if (this.model) {
      this.unload();
    }

    const { Live2DModel } = await import("pixi-live2d-display/cubism4");
    const model = await Live2DModel.from(modelUrl);
    model.interactive = false;
    this.model = model;
    this.app.stage.addChild(model);
    this.fitModel();
  }

  unload(): void {
    if (!this.model) return;
    this.app.stage.removeChild(this.model);
    this.model.destroy();
    this.model = null;
  }

  setExpression(expression: string | null): void {
    if (!this.model || !expression) return;
    const fn = (this.model as any).expression;
    if (typeof fn === "function") {
      fn.call(this.model, expression);
    }
  }

  triggerMotion(motion: string | null, priority: MotionPriority): void {
    if (!this.model || !motion) return;
    const fn = (this.model as any).motion;
    if (typeof fn !== "function") return;
    try {
      fn.call(this.model, motion, 0, priority);
    } catch (error) {
      try {
        fn.call(this.model, motion, priority);
      } catch (err) {
        // Ignore unsupported motion signature
      }
    }
  }

  setParameter(id: string, value: number): void {
    const core = (this.model as any)?.internalModel?.coreModel;
    if (core && typeof core.setParameterValueById === "function") {
      core.setParameterValueById(id, value);
    }
  }

  dispose(): void {
    this.unload();
    window.removeEventListener("resize", this.resizeHandler);
    this.app.destroy(true, { children: true });
  }

  private fitModel(): void {
    if (!this.model) return;
    const renderer = this.app.renderer;
    const width = renderer.width;
    const height = renderer.height;

    const bounds = this.model.getLocalBounds();
    const scale = Math.min(width / bounds.width, height / bounds.height) * 0.9;

    this.model.scale.set(scale, scale);

    if ((this.model as any).anchor) {
      (this.model as any).anchor.set(0.5, 1);
    } else {
      this.model.pivot.set(bounds.width / 2, bounds.height);
    }

    this.model.position.set(width / 2, height * 0.95);
  }
}
