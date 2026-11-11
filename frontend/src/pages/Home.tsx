
import { useEffect, useState } from "react";
import {
    BookOpen,
    Search,
    Library,
    Users,
    Clock,
    ArrowRight,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

import api from "../services/api";

function Home() {
    const [connection, setConnection] = useState("CHECKING");

    useEffect(() => {
        api.get("/health/db")
            .then(() => setConnection("CONNECTED"))
            .catch(() => setConnection("DISCONNECTED"));
    }, []);

    return (
        <div className="app">
            <header className="navbar">
                <a href="/" className="brand">
                    <div className="brand-icon">
                        <BookOpen size={24} />
                    </div>
                    <span>LBMS</span>
                </a>

                <nav className="nav-links">
                    <a href="#home">Trang chủ</a>
                    <a href="#catalog">Tra cứu sách</a>
                    <a href="#about">Giới thiệu</a>
                </nav>

                <a href="/login" className="login-button">
                    Đăng nhập
                    <ArrowRight size={16} />
                </a>
            </header>

            <main>
                <section className="hero" id="home">
                    <div className="hero-content">
                        <div className="eyebrow">
                            <Library size={16} />
                            HỆ THỐNG THƯ VIỆN ĐIỆN TỬ
                        </div>

                        <h1>
                            Khám phá tri thức,
                            <br />
                            <span>mở rộng tương lai.</span>
                        </h1>

                        <p>
                            Tra cứu tài liệu, quản lý việc mượn và trả sách
                            một cách thuận tiện trên cùng một nền tảng.
                        </p>

                        <div className="hero-actions">
                            <a href="#catalog" className="primary-button">
                                <Search size={18} />
                                Tra cứu sách
                            </a>

                            <a href="#about" className="secondary-button">
                                Tìm hiểu thêm
                            </a>
                        </div>

                        <div className="connection-status">
                            {connection === "CONNECTED" ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    SQL Server đang kết nối
                                </>
                            ) : connection === "DISCONNECTED" ? (
                                <>
                                    <AlertCircle size={16} />
                                    Không thể kết nối database
                                </>
                            ) : (
                                <>
                                    <Clock size={16} />
                                    Đang kiểm tra kết nối...
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="book-illustration">
                            <BookOpen size={110} strokeWidth={1.2} />
                        </div>

                        <div className="floating-card">
                            <Users size={22} />
                            <div>
                                <strong>LBMS</strong>
                                <span>Library Management</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="features" id="catalog">
                    <div className="section-heading">
                        <span>CHỨC NĂNG HỆ THỐNG</span>
                        <h2>Mọi hoạt động thư viện trong một nơi</h2>
                    </div>

                    <div className="feature-grid">
                        <div className="feature-card">
                            <div className="feature-icon blue">
                                <Search size={25} />
                            </div>
                            <h3>Tra cứu sách</h3>
                            <p>
                                Tìm kiếm sách theo tên, tác giả và thể loại.
                                Kiểm tra trạng thái sẵn có.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon purple">
                                <BookOpen size={25} />
                            </div>
                            <h3>Quản lý mượn trả</h3>
                            <p>
                                Theo dõi giao dịch mượn sách, ngày hết hạn
                                và lịch sử trả sách.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon orange">
                                <Clock size={25} />
                            </div>
                            <h3>Gia hạn và quá hạn</h3>
                            <p>
                                Gửi yêu cầu gia hạn, theo dõi trạng thái
                                quá hạn và tiền phạt.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="about">
                <div className="brand">
                    <BookOpen size={22} />
                    <span>LBMS</span>
                </div>

                <p>Library Borrowing Management System</p>
            </footer>
        </div>
    );
}

export default Home;