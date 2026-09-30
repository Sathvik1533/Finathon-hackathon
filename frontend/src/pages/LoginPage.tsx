import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/forms/LoginForm';
import { login as apiLogin } from '../api/auth';
export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleLogin = async (u: string, p: string) => {
    const res = await apiLogin(u, p);
    login(res.role, res.token);
    navigate('/dashboard');
  };
  return <LoginForm onSubmit={handleLogin} />;
};
