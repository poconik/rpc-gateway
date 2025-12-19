const isRetryableHttpStatus = (status: number): boolean => {
  if (status >= 500 && status <= 599) {
    return true;
  }

  return [401, 402, 403, 404, 408, 429].includes(status);
};

export default isRetryableHttpStatus;
