
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { account, isAuthenticated } = useAuth();

    if (!isAuthenticated || !account) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(account.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;