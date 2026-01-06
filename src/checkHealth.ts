const checkHealth = async (): Promise<void> => {
  const port = process.env.GATEWAY_PORT ?? '18545';

  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch {
    process.exitCode = 1;
  }
};

void checkHealth();
