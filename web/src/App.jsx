import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Vendas from './pages/Vendas';
import Loading from './components/Loading';

// Rota protegida
const PrivateRoute = ({ children }) => {
  const { estaAutenticado, carregando } = useContext(AuthContext);

  if (carregando) {
    return <Loading />;
  }

  return estaAutenticado() ? children : <Navigate to="/login" />;
};

// Rota pública (redireciona se já autenticado)
const PublicRoute = ({ children }) => {
  const { estaAutenticado, carregando } = useContext(AuthContext);

  if (carregando) {
    return <Loading />;
  }

  return !estaAutenticado() ? children : <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Vendas />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
