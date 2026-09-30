export const login = async (user: string, pass: string) => {
  return { token: 'mock-jwt-token', role: 'admin' };
};
export const logout = async () => {};
