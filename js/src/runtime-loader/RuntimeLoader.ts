import * as packageData from "package.json";
import * as rc from "./../rive_advanced.mjs";
import { RuntimeCallback } from "./types";

/**
 * The `RuntimeLoader` class is a singleton that manages the loading and
 * initialization of the Rive runtime. It provides a way to get an instance of
 * the Rive runtime through a callback or a Promise.
 *
 * The class handles the loading of the WASM file for the Rive runtime, and
 * provides fallback mechanisms in case the primary WASM file cannot be loaded.
 *
 * The `getInstance` method allows you to register a callback that will be
 * called when the Rive runtime is ready. The `awaitInstance` method returns a
 * Promise that resolves to the Rive runtime instance.
 *
 * The `setWasmUrl` method allows you to manually set the URL of the WASM file
 * to be loaded.
 */
export class RuntimeLoader {
  /**
   * The instance of the Rive runtime. This is a private static property that
   * holds the loaded Rive runtime instance. It is used internally by the
   * RuntimeLoader class to provide access to the Rive runtime.
   * @private
   */
  private static runtime: rc.RiveCanvas;
  /**
   * A flag to indicate that loading has started/completed.
   * @private
   */
  private static isLoading = false;
  /**
   * A queue of callbacks to be called when the Rive runtime is ready.
   * This queue is used to store callbacks that are registered before the
   * runtime has finished loading. Once the runtime is loaded, all the
   * callbacks in this queue will be executed.
   * @private
   */
  private static callBackQueue: RuntimeCallback[] = [];
  /**
   * The instance of the Rive runtime. This is a private static property that
   * holds the loaded Rive runtime instance. It is used internally by the
   * RuntimeLoader class to provide access to the Rive runtime.
   * @private
   */
  private static rive: rc.RiveCanvas;
  /**
   * The URL of the WASM file for the Rive runtime. This is the default URL used to load the WASM file from unpkg.com.
   * If the primary WASM file cannot be loaded from this URL, a fallback URL on jsdelivr.net will be used.
   * @private
   */
  private static wasmURL = `https://unpkg.com/${packageData.name}@${packageData.version}/rive.wasm`;

  // Class is never instantiated
  private constructor() {}

  /**
   * Loads the Rive runtime from the specified WASM URL. If the primary WASM file
   * cannot be loaded from the default URL, a fallback URL on jsdelivr.net will
   * be used. Once the runtime is loaded, any callbacks registered via the
   * `getInstance` method will be executed.
   *
   * This method is called internally by the `getInstance` and `awaitInstance`
   * methods to load the Rive runtime. It should not be called directly by
   * users of the RuntimeLoader class.
   * @private
   */
  private static loadRuntime(): void {
    rc.default({
      // Loads Wasm bundle
      locateFile: () => RuntimeLoader.wasmURL,
    })
      .then((rive: rc.RiveCanvas) => {
        RuntimeLoader.runtime = rive;
        // Fire all the callbacks
        while (RuntimeLoader.callBackQueue.length > 0) {
          RuntimeLoader.callBackQueue.shift()?.(RuntimeLoader.runtime);
        }
      })
      .catch(() => {
        // In case unpkg fails, or the wasm was not supported, we try to load the fallback module from jsdelivr.
        // This `rive_fallback.wasm` is compiled to support older architecture.
        // TODO: (Gordon): preemptively test browser support and load the correct wasm file. Then use jsdelvr only if unpkg fails.
        const backupJsdelivrUrl = `https://cdn.jsdelivr.net/npm/${packageData.name}@${packageData.version}/rive_fallback.wasm`;
        if (RuntimeLoader.wasmURL.toLowerCase() !== backupJsdelivrUrl) {
          console.warn(
            `Failed to load WASM from ${RuntimeLoader.wasmURL}, trying jsdelivr as a backup`
          );
          RuntimeLoader.setWasmUrl(backupJsdelivrUrl);
          RuntimeLoader.loadRuntime();
        } else {
          console.error(
            "Could not load Rive WASM file from unpkg or jsdelivr, network connection may be down, or \
        you may need to call set a new WASM source via RuntimeLoader.setWasmUrl() and call \
        RuntimeLoader.loadRuntime() again"
          );
        }
      });
  }

  /**
   * Retrieves an instance of the Rive runtime, loading it if necessary.
   * If the runtime is already loaded, the provided callback will be executed immediately.
   * Otherwise, the callback will be queued and executed once the runtime is loaded.
   * @param callback - A function that will be called with the loaded Rive runtime instance.
   */
  public static getInstance(callback: RuntimeCallback): void {
    // If it's not loading, start loading runtime
    if (!RuntimeLoader.isLoading) {
      RuntimeLoader.isLoading = true;
      RuntimeLoader.loadRuntime();
    }
    if (!RuntimeLoader.runtime) {
      RuntimeLoader.callBackQueue.push(callback);
    } else {
      callback(RuntimeLoader.runtime);
    }
  }

  /**
   * Provides a promise that resolves to an instance of the Rive runtime.
   * This method will load the Rive runtime if it has not been loaded already,
   * and will return a promise that resolves to the loaded runtime instance.
   * @returns A promise that resolves to the Rive runtime instance.
   */
  public static awaitInstance(): Promise<rc.RiveCanvas> {
    return new Promise<rc.RiveCanvas>((resolve) =>
      RuntimeLoader.getInstance((rive: rc.RiveCanvas): void => resolve(rive))
    );
  }

  /**
   * Manually sets the URL for the WASM file that the Rive runtime will load.
   * @param url - The URL of the WASM file to be loaded.
   */
  public static setWasmUrl(url: string): void {
    RuntimeLoader.wasmURL = url;
  }
}
