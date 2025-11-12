// client-bootstrap.ts

"use client";

// Guard against third-party libs reading DevTools fields in sandboxed/iframes.
declare global {
  interface Window { __REACT_DEVTOOLS_GLOBAL_HOOK__?: any }
}

if (typeof window !== "undefined") {
  const w = window as any;
  if (!w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject() {},
      onCommitFiberRoot() {},
      onCommitFiberUnmount() {},
      _debug: () => {},
    };
  } else if (typeof w.__REACT_DEVTOOLS_GLOBAL_HOOK__._debug === "undefined") {
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__._debug = () => {};
  }
}

// This export ensures the file is treated as a module.
export {};
