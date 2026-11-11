
import { useState } from "react";
import {
    BookOpen,
    Mail,
    Lock,
    ArrowLeft,
    LogIn
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

function Login() {
    const [role, setRole] = useState<UserRole>("STUDENT");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const dashboardPaths: Record<UserRole, string> = {
        STUDENT: "/dashboard/student",
        LECTURER: "/dashboard/lecturer",
        LIBRARIAN: "/dashboard/librarian",
        ADMIN: "/dashboard/admin"
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await login(email.trim(), password, role);
            navigate(dashboardPaths[role], { replace: true });
        } catch (err: unknown) {
            if (
                typeof err === "object" &&
                err !== null &&
                "response" in err
            ) {
                const apiError = err as {
                    response?: {
                        data?: {
                            message?: string;
                        };
                    };
                };

                setError(
                    apiError.response?.data?.message ||
                    "Đăng nhập thất bại. Vui lòng kiểm tra thông tin."
                );
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Đã xảy ra lỗi. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <Link to="/" className="back-home">
                    <ArrowLeft size={17} />
                    Quay lại trang chủ
                </Link>

                <div className="login-brand">
                    <div className="login-brand-icon">
                        <BookOpen size={30} />
                    </div>
                    <h1>LBMS</h1>
                    <p>Library Borrowing Management System</p>
                </div>

                <div className="login-heading">
                    <h2>Đăng nhập</h2>
                    <p>Đăng nhập để sử dụng hệ thống thư viện</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="form-label">Vai trò tài khoản</label>

                    <div className="role-options">
                        {([
                            ["STUDENT", "Sinh viên"],
                            ["LECTURER", "Giảng viên"],
                            ["LIBRARIAN", "Thủ thư"],
                            ["ADMIN", "Quản trị viên"]
                        ] as [UserRole, string][]).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={`role-option ${role === value ? "active" : ""}`}
                                onClick={() => setRole(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <label className="form-label" htmlFor="email">
                        Email
                    </label>

                    <div className="input-wrapper">
                        <Mail size={18} />
                        <input
                            id="email"
                            type="email"
                            placeholder="Nhập địa chỉ email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <label className="form-label" htmlFor="password">
                        Mật khẩu
                    </label>

                    <div className="input-wrapper">
                        <Lock size={18} />
                        <input
                            id="password"
                            type="password"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </div>
                    
                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-login"
                        disabled={loading}
                    >
                        <LogIn size={18} />
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                <p className="login-note">
                    LBMS - Hệ thống quản lý mượn và trả sách thư viện
                </p>
            </div>
        </div>
    );
}

export default Login;