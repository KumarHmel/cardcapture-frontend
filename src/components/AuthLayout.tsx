//import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUtility } from '../context/utility.context';
import type { ReactNode } from 'react'; 

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { token } = useUtility();
  
  return token ? children : <Navigate to="/login" replace />;
};

export default AuthLayout;
