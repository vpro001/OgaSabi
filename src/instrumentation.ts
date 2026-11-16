// Runs once when the Next.js server boots. `register` is called in every runtime, so anything that
// needs Node.js lives in instrumentation-node.ts and is only imported there.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
