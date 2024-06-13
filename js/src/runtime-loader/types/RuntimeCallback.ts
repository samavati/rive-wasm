import * as rc from "./../../rive_advanced.mjs";

/**
 * A callback function that is called when the Rive runtime instance is ready.
 * The callback receives the loaded Rive runtime instance as a parameter.
 */
export type RuntimeCallback = (rive: rc.RiveCanvas) => void;
