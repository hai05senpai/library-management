
import {
    BookOpen,
    LayoutDashboard,
    UserRound,
    LogOut,
    Library,
    Users,
    ClipboardList,
    ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
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

    const isManager =
        account.role === "ADMIN" || account.role === "LIBRARIAN";

    return (
        <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
                <div className="dashboard-brand">
                    <div className="dashboard-brand-icon">
                        <Library size={25} />
                    </div>
                    <div>
                        <h2>LBMS</h2>
                        <span>Library System</span>
                    </div>
                </div>

                <div className="dashboard-menu-label">
                    MENU CHÍNH
                </div>

                <nav className="dashboard-nav">
                    <Link to="/dashboard" className="dashboard-nav-item active">
                        <LayoutDashboard size={19} />
                        <span>Dashboard</span>
                    </Link>

                    <Link to="/books" className="dashboard-nav-item">
                        <BookOpen size={19} />
                        <span>Quản lý sách</span>
                    </Link>

                    {isManager && (
                        <div className="dashboard-nav-item disabled">
                            <Users size={19} />
                            <span>Quản lý độc giả</span>
                        </div>
                    )}

                    <div className="dashboard-nav-item disabled">
                        <ClipboardList size={19} />
                        <span>Quản lý mượn trả</span>
                    </div>
                </nav>

                <div className="dashboard-sidebar-bottom">
                    <div className="dashboard-user-mini">
                        <div className="dashboard-avatar">
                            <UserRound size={20} />
                        </div>
                        <div className="dashboard-user-info">
                            <strong>{account.fullName}</strong>
                            <span>{roleLabels[account.role]}</span>
                        </div>
                    </div>

                    <button
                        className="dashboard-logout"
                        onClick={logout}
                    >
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Tổng quan hệ thống quản lý thư viện</p>
                    </div>

                    <div className="dashboard-topbar-user">
                        <div className="dashboard-avatar">
                            <UserRound size={20} />
                        </div>
                        <div>
                            <strong>{account.fullName}</strong>
                            <span>{roleLabels[account.role]}</span>
                        </div>
                    </div>
                </header>

                <section className="dashboard-welcome">
                    <div>
                        <span className="dashboard-welcome-label">
                            LIBRARY MANAGEMENT SYSTEM
                        </span>
                        <h2>Xin chào, {account.fullName}!</h2>
                        <p>
                            Chào mừng bạn đến với hệ thống quản lý thư viện LBMS.
                            Hãy chọn chức năng bên dưới để bắt đầu.
                        </p>
                    </div>

                    <div className="dashboard-welcome-icon">
                        <Library size={76} strokeWidth={1.2} />
                    </div>
                </section>

                <section className="dashboard-section">
                    <div className="dashboard-section-heading">
                        <div>
                            <h2>Thông tin tài khoản</h2>
                            <p>Thông tin đăng nhập hiện tại của bạn</p>
                        </div>
                    </div>

                    <div className="dashboard-account-card">
                        <div className="dashboard-account-item">
                            <span>Họ và tên</span>
                            <strong>{account.fullName}</strong>
                        </div>

                        <div className="dashboard-account-item">
                            <span>Email</span>
                            <strong>{account.email}</strong>
                        </div>

                        <div className="dashboard-account-item">
                            <span>Vai trò</span>
                            <strong>{roleLabels[account.role]}</strong>
                        </div>
                    </div>
                </section>

                <section className="dashboard-section">
                    <div className="dashboard-section-heading">
                        <div>
                            <h2>Chức năng hệ thống</h2>
                            <p>Truy cập nhanh các chức năng của LBMS</p>
                        </div>
                    </div>

                    <div className="dashboard-feature-grid">
                        <Link to="/books" className="dashboard-feature-card">
                            <div className="dashboard-feature-icon blue">
                                <BookOpen size={25} />
                            </div>

                            <h3>Quản lý sách</h3>
                            <p>
                                Tra cứu thông tin sách và xem số lượng bản sao
                                có thể cho mượn.
                            </p>

                            <span className="dashboard-feature-link">
                                Truy cập chức năng
                                <ArrowRight size={17} />
                            </span>
                        </Link>

                        <div className="dashboard-feature-card unavailable">
                            <div className="dashboard-feature-icon purple">
                                <ClipboardList size={25} />
                            </div>

                            <h3>Quản lý mượn trả</h3>
                            <p>
                                Theo dõi các giao dịch mượn, trả và tình trạng
                                tài liệu.
                            </p>

                            <span className="dashboard-feature-coming">
                                Sắp triển khai
                            </span>
                        </div>

                        {isManager && (
                            <div className="dashboard-feature-card unavailable">
                                <div className="dashboard-feature-icon orange">
                                    <Users size={25} />
                                </div>

                                <h3>Quản lý độc giả</h3>
                                <p>
                                    Quản lý thông tin và trạng thái tài khoản
                                    độc giả.
                                </p>

                                <span className="dashboard-feature-coming">
                                    Sắp triển khai
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                <footer className="dashboard-footer">
                    LBMS - Library Borrowing Management System
                </footer>
            </main>
        </div>
    );
}

export default Dashboard;