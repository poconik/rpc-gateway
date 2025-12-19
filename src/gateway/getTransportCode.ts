const getTransportCode = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const cause = error.cause;

  if (
    typeof cause !== 'object' ||
    cause === null ||
    !('code' in cause) ||
    typeof cause.code !== 'string' ||
    !/^[A-Z_]{1,64}$/.test(cause.code)
  ) {
    return undefined;
  }

  return cause.code;
};

export default getTransportCode;
