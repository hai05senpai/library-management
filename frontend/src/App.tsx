
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

import "./App.css";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                        
                        <Route
                            element={<ProtectedRoute allowedRoles={["STUDENT"]} />}
                        >
                            <Route
                                path="/dashboard/student"
                                element={<Dashboard />}
                            />
                        </Route>

                        <Route
                            element={<ProtectedRoute allowedRoles={["LECTURER"]} />}
                        >
                            <Route
                                path="/dashboard/lecturer"
                                element={<Dashboard />}
                            />
                        </Route>

                        <Route
                            element={<ProtectedRoute allowedRoles={["LIBRARIAN"]} />}
                        >
                            <Route
                                path="/dashboard/librarian"
                                element={<Dashboard />}
                            />
                        </Route>

                        <Route
                            element={<ProtectedRoute allowedRoles={["ADMIN"]} />}
                        >
                            <Route
                                path="/dashboard/admin"
                                element={<Dashboard />}
                            />
                        </Route>

                        <Route path="/books" element={<Books />} />

                    </Route>

                    <Route
                        path="/dashboard"
                        element={<Navigate to="/login" replace />}
                    />

                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;