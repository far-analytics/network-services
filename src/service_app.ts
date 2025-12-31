import { CallMessage, ResultMessage } from "./messages";
import { QueueSizeLimitError, PropertyPathError } from "./errors";
import { Async, Callable, PropPath } from "./types";
import { Mux } from "./mux";

export interface ServiceAppOptions<T extends object> {
  paths?: PropPath<Async<T>>[];
}

export class ServiceApp<T extends object> {
  public app?: object;
  public paths?: PropPath<Async<T>>[];
  public mux: Mux;

  constructor(app: T, mux: Mux, options?: ServiceAppOptions<T>) {
    this.app = app;
    this.paths = options?.paths;
    this.mux = mux;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.mux.on("call", this.tryCall.bind(this));

    this.mux.stream.once("close", () => {
      delete this.app;
    });
  }

  protected async tryCall(message: CallMessage): Promise<void> {
    const id = message.id;
    try {
      const props = message.props;

      let propPath;
      if (this.paths) {
        propPath = props.join(".") as PropPath<Async<T>>;
        if (!this.paths.includes(propPath)) {
          throw new PropertyPathError(`The property path, ${propPath}, is not an allowed property path.`);
        }
      }

      let base = this.app as Record<string, unknown>;
      for (let i = 0; i < props.length - 1; i++) {
        base = base[props[i]] as Record<string, unknown>;
      }

      if (typeof base[props[props.length - 1]] != "function") {
        throw new TypeError(`${props[props.length - 1]} is not a function`);
      }

      const result = await (base[props[props.length - 1]] as Callable)(...message.args);
      this.mux.mux(new ResultMessage({ type: 2, id, data: result }));
    } catch (err) {
      if (!(err instanceof QueueSizeLimitError)) {
        try {
          const error = this.createError(err);
          this.mux.mux(new ResultMessage({ type: 1, id, data: error }));
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  protected createError(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
      const error: Record<string, unknown> = {};
      for (const name of Object.getOwnPropertyNames(err).concat(
        Object.getOwnPropertyNames(Object.getPrototypeOf(err))
      )) {
        error[name] = (err as unknown as Record<string, unknown>)[name];
      }
      return error;
    } else {
      const error: Record<string, unknown> = {};
      error.message = err?.toString?.();
      return error;
    }
  }
}
