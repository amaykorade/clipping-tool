/**
 * Simple circuit breaker for external API calls.
 * After `threshold` consecutive failures, the circuit opens for `resetTimeMs`.
 * During open state, calls fail immediately without hitting the external service.
 */

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuits = new Map<string, CircuitState>();

const DEFAULT_THRESHOLD = 5;
const DEFAULT_RESET_MS = 60_000; // 60 seconds

export interface CircuitBreakerOptions {
  /** Name/key for this circuit (e.g. "assemblyai", "openai") */
  name: string;
  /** Number of consecutive failures before opening. Default: 5 */
  threshold?: number;
  /** Time in ms to wait before half-opening. Default: 60000 */
  resetTimeMs?: number;
}

function getCircuit(name: string): CircuitState {
  let circuit = circuits.get(name);
  if (!circuit) {
    circuit = { failures: 0, lastFailure: 0, state: "closed" };
    circuits.set(name, circuit);
  }
  return circuit;
}

/**
 * Execute a function with circuit breaker protection.
 * Throws CircuitOpenError if the circuit is open.
 */
export async function withCircuitBreaker<T>(
  opts: CircuitBreakerOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const { name, threshold = DEFAULT_THRESHOLD, resetTimeMs = DEFAULT_RESET_MS } = opts;
  const circuit = getCircuit(name);

  // Check if circuit should transition from open to half-open
  if (circuit.state === "open") {
    if (Date.now() - circuit.lastFailure >= resetTimeMs) {
      circuit.state = "half-open";
      console.log(`[CircuitBreaker] ${name}: open → half-open (allowing probe)`);
    } else {
      throw new CircuitOpenError(name, resetTimeMs - (Date.now() - circuit.lastFailure));
    }
  }

  try {
    const result = await fn();
    // Success: reset the circuit
    if (circuit.failures > 0 || circuit.state !== "closed") {
      console.log(`[CircuitBreaker] ${name}: reset to closed (success after ${circuit.failures} failures)`);
    }
    circuit.failures = 0;
    circuit.state = "closed";
    return result;
  } catch (error) {
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= threshold) {
      circuit.state = "open";
      console.warn(`[CircuitBreaker] ${name}: OPEN after ${circuit.failures} consecutive failures`);
    }

    throw error;
  }
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly retryAfterMs: number,
  ) {
    super(`Circuit breaker "${circuitName}" is open. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "CircuitOpenError";
  }
}

/** Get current circuit status (for monitoring/debugging). */
export function getCircuitStatus(name: string): CircuitState & { name: string } {
  return { name, ...getCircuit(name) };
}
