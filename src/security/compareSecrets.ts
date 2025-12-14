const compareSecrets = (left: string, right: string): number => {
  return right.length - left.length;
};

export default compareSecrets;
