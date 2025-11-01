import { Navigate } from "react-router-dom";

function AuthRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
}

export default AuthRoute;
