export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUserInfo = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setUserInfo = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUserInfo = () => {
  localStorage.removeItem('user');
};

export const logout = () => {
  removeToken();
  removeUserInfo();
};
