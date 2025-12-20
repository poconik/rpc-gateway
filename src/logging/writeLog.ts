const writeLog = (event: string, fields: Record<string, unknown> = {}): void => {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`);
};

export default writeLog;
