/**
 * @description Declare event types for listening with listenTS() and dispatching with dispatchTS()
 */
export type EventTS = {
  traceryLog: {
    level: "info" | "warn" | "error";
    message: string;
  };
};
