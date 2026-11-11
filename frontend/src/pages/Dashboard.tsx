
import { useAuth } from "../contexts/AuthContext";

function Dashboard() {
    const { account, logout } = useAuth();

    if (!account) {
        return null;
    }

    const roleLabels: Record<string, string> = {
        STUDENT: "Sinh viên",
        LECTURER: "Giảng viên",
        LIBRARIAN: "Thủ thư",
        ADMIN: "Quản trị viên"
    };

    return (
        <div style={{ padding: "40px", fontFamily: "Inter, sans-serif" }}>
            <h1>LBMS Dashboard</h1>

            <p>Xin chào, {account.fullName}!</p>
            <p>Email: {account.email}</p>
            <p>Vai trò: {roleLabels[account.role]}</p>

            <button onClick={logout}>
                Đăng xuất
            </button>
        </div>
    );
}

export default Dashboard;