
import { useEffect, useState, type FormEvent } from "react";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    RefreshCw,
    Eye,
    Plus
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

// ==================== TYPES ====================

type TransactionStatus = "BORROWED" | "OVERDUE" | "RETURNED";

interface BorrowTransaction {
    transaction_id: number;
    borrower_id: number;
    barcode: string;
    borrower_name: string;
    role_name: string;

    copy_id: number;
    copy_barcode: string;

    book_id: number;
    book_title: string;
    author: string | null;

    librarian_id: number;
    librarian_name: string;

    borrow_date: string;
    due_date: string;
    return_date: string | null;
    status: TransactionStatus;
    created_at: string;
}

interface BorrowTransactionDetail extends Omit<BorrowTransaction, "status"> {
    borrower_email: string;
    borrower_status: string;
    copy_status: string;

    isbn: string | null;
    category: string | null;
    publisher: string | null;

    transaction_status: TransactionStatus;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface TransactionListResponse {
    success: boolean;
    message: string;
    data: {
        transactions: BorrowTransaction[];
        pagination: Pagination;
    };
}

interface TransactionDetailResponse {
    success: boolean;
    message: string;
    data: BorrowTransactionDetail;
}

// ==================== HELPERS ====================

const statusLabels: Record<TransactionStatus, string> = {
    BORROWED: "Đang mượn",
    OVERDUE: "Quá hạn",
    RETURNED: "Đã trả"
};

const formatDate = (value: string | null) => {
    if (!value) return "Chưa trả";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Không xác định";
    }

    return date.toLocaleDateString("vi-VN");
};

const getErrorMessage = (error: unknown) => {
    const err = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return (
        err.response?.data?.message ||
        err.message ||
        "Đã xảy ra lỗi. Vui lòng thử lại."
    );
};

// ==================== COMPONENT ====================

function BorrowTransactions() {
    const { account } = useAuth();

    const [transactions, setTransactions] = useState<BorrowTransaction[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedTransaction, setSelectedTransaction] =
        useState<BorrowTransactionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // ==================== CREATE TRANSACTION ====================

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [borrowerBarcode, setBorrowerBarcode] = useState("");
    const [copyBarcode, setCopyBarcode] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const dashboardPaths: Record<string, string> = {
        STUDENT: "/dashboard/student",
        LECTURER: "/dashboard/lecturer",
        LIBRARIAN: "/dashboard/librarian",
        ADMIN: "/dashboard/admin"
    };

    const dashboardPath = account
        ? dashboardPaths[account.role]
        : "/";

    const isBorrower =
        account?.role === "STUDENT" ||
        account?.role === "LECTURER";

    // ==================== LOAD TRANSACTION LIST ====================

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get<TransactionListResponse>(
                "/borrow-transactions",
                {
                    params: {
                        search: search || undefined,
                        status: status || undefined,
                        page: pagination.page,
                        limit: pagination.limit
                    }
                }
            );

            setTransactions(response.data.data.transactions);
            setPagination(response.data.data.pagination);
        } catch (err) {
            setError(getErrorMessage(err));
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [search, status, pagination.page]);

    // ==================== LOAD TRANSACTION DETAIL ====================

    useEffect(() => {
        if (selectedId === null) {
            setSelectedTransaction(null);
            setDetailError("");
            return;
        }

        const fetchDetail = async () => {
            try {
                setDetailLoading(true);
                setDetailError("");
                setSelectedTransaction(null);

                const response =
                    await api.get<TransactionDetailResponse>(
                        `/borrow-transactions/${selectedId}`
                    );

                setSelectedTransaction(response.data.data);
            } catch (err) {
                setDetailError(getErrorMessage(err));
            } finally {
                setDetailLoading(false);
            }
        };

        fetchDetail();
    }, [selectedId]);

    // ==================== SEARCH ====================

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setPagination((previous) => ({
            ...previous,
            page: 1
        }));

        setSearch(searchInput.trim());
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);

        setPagination((previous) => ({
            ...previous,
            page: 1
        }));
    };

    // ==================== PAGINATION ====================

    const handlePreviousPage = () => {
        setPagination((previous) => ({
            ...previous,
            page: Math.max(1, previous.page - 1)
        }));
    };

    const handleNextPage = () => {
        setPagination((previous) => ({
            ...previous,
            page: Math.min(
                previous.totalPages,
                previous.page + 1
            )
        }));
    };

    // ==================== MODAL ====================

    const closeDetail = () => {
        setSelectedId(null);
        setSelectedTransaction(null);
        setDetailError("");
    };

    // ==================== CREATE TRANSACTION ====================

    const handleCreateTransaction = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setCreateError("");
        setSuccessMessage("");

        const normalizedBorrowerBarcode = borrowerBarcode.trim();
        const normalizedCopyBarcode = copyBarcode.trim();

        if (!normalizedBorrowerBarcode) {
            setCreateError("Vui lòng nhập barcode người mượn.");
            return;
        }

        if (!normalizedCopyBarcode) {
            setCreateError("Vui lòng nhập barcode bản sao sách.");
            return;
        }

        if (normalizedBorrowerBarcode.length > 50) {
            setCreateError("Barcode người mượn không được vượt quá 50 ký tự.");
            return;
        }

        if (normalizedCopyBarcode.length > 50) {
            setCreateError("Barcode bản sao sách không được vượt quá 50 ký tự.");
            return;
        }

        try {
            setCreating(true);

            await api.post("/borrow-transactions", {
                borrowerBarcode: normalizedBorrowerBarcode,
                copyBarcode: normalizedCopyBarcode
            });

            setBorrowerBarcode("");
            setCopyBarcode("");
            setShowCreateModal(false);

            setSuccessMessage("Tạo phiếu mượn thành công!");

            // Đặt lại bộ lọc và tải danh sách trang đầu tiên.
            setSearch("");
            setSearchInput("");
            setStatus("");
            setPagination((previous) => ({
                ...previous,
                page: 1
            }));

            // Tải lại ngay với tham số mặc định.
            const response = await api.get<TransactionListResponse>(
                "/borrow-transactions",
                {
                    params: {
                        page: 1,
                        limit: pagination.limit
                    }
                }
            );

            setTransactions(response.data.data.transactions);
            setPagination(response.data.data.pagination);

        } catch (err) {
            setCreateError(getErrorMessage(err));
        } finally {
            setCreating(false);
        }
    };

    // ==================== RENDER ====================

    return (
        <div className="borrow-page">

            {/* HEADER */}
            <div className="borrow-header">
                <div className="borrow-header-top">
                    <Link
                        to={dashboardPath}
                        className="borrow-back-link"
                    >
                        <ArrowLeft size={18} />
                        <span>Quay lại Dashboard</span>
                    </Link>
                </div>

                <div className="borrow-heading">
                    <div>
                        <h1>Quản lý giao dịch mượn trả</h1>

                        <p>
                            {isBorrower
                                ? "Theo dõi lịch sử mượn và trả sách của bạn."
                                : "Theo dõi các giao dịch mượn và trả sách trong hệ thống."}
                        </p>
                    </div>

                    <div className="borrow-heading-actions">
                        {account?.role === "LIBRARIAN" && (
                            <button
                                type="button"
                                className="borrow-create-button"
                                onClick={() => {
                                    setCreateError("");
                                    setShowCreateModal(true);
                                }}
                            >
                                <Plus size={17} />
                                Tạo phiếu mượn
                            </button>
                        )}

                        <button
                            className="borrow-refresh-button"
                            onClick={fetchTransactions}
                            disabled={loading}
                            type="button"
                        >
                            <RefreshCw size={16} />
                            Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="borrow-toolbar">
                <form
                    className="borrow-search-form"
                    onSubmit={handleSearch}
                >
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Tìm mã người mượn, tên, tên sách, mã bản sao..."
                        value={searchInput}
                        onChange={(event) =>
                            setSearchInput(event.target.value)
                        }
                    />

                    <button type="submit">
                        Tìm kiếm
                    </button>
                </form>

                <div className="borrow-filter">
                    <label htmlFor="transaction-status">
                        Trạng thái:
                    </label>

                    <select
                        id="transaction-status"
                        value={status}
                        onChange={(event) =>
                            handleStatusChange(event.target.value)
                        }
                    >
                        <option value="">Tất cả</option>
                        <option value="BORROWED">Đang mượn</option>
                        <option value="OVERDUE">Quá hạn</option>
                        <option value="RETURNED">Đã trả</option>
                    </select>
                </div>
            </div>

            {/* TABLE SUMMARY */}
            <div className="borrow-list-header">
                <div>
                    <h2>Danh sách giao dịch</h2>
                    <p>
                        Tổng cộng {pagination.total} giao dịch
                    </p>
                </div>
            </div>

            {successMessage && (
                <div className="borrow-success">
                    {successMessage}
                </div>
            )}

            {/* ERROR */}
            {error && (
                <div className="borrow-error">
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={fetchTransactions}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* TABLE */}
            <div className="borrow-table-container">
                <table className="borrow-table">
                    <thead>
                        <tr>
                            <th>Mã giao dịch</th>
                            <th>Người mượn</th>
                            <th>Sách</th>
                            <th>Mã bản sao</th>
                            <th>Ngày mượn</th>
                            <th>Ngày đến hạn</th>
                            <th>Ngày trả</th>
                            <th>Trạng thái</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="borrow-state">
                                        Đang tải dữ liệu...
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="borrow-state">
                                        Không thể tải danh sách giao dịch.
                                    </div>
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="borrow-state">
                                        Không tìm thấy giao dịch nào.
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            transactions.map((transaction) => (
                                <tr key={transaction.transaction_id}>
                                    <td>
                                        <strong>
                                            #{transaction.transaction_id}
                                        </strong>
                                    </td>

                                    <td>
                                        <div className="borrow-primary-text">
                                            {transaction.borrower_name}
                                        </div>
                                        <div className="borrow-secondary-text">
                                            {transaction.barcode}
                                        </div>
                                    </td>

                                    <td>
                                        <div className="borrow-primary-text">
                                            {transaction.book_title}
                                        </div>
                                        <div className="borrow-secondary-text">
                                            {transaction.author || "Chưa có tác giả"}
                                        </div>
                                    </td>

                                    <td>{transaction.copy_barcode}</td>

                                    <td>
                                        {formatDate(transaction.borrow_date)}
                                    </td>

                                    <td>
                                        {formatDate(transaction.due_date)}
                                    </td>

                                    <td>
                                        {formatDate(transaction.return_date)}
                                    </td>

                                    <td>
                                        <span
                                            className={`borrow-status borrow-status-${transaction.status.toLowerCase()}`}
                                        >
                                            {statusLabels[transaction.status]}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="borrow-detail-button"
                                            title="Xem chi tiết"
                                            onClick={() =>
                                                setSelectedId(
                                                    transaction.transaction_id
                                                )
                                            }
                                        >
                                            <Eye size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="borrow-pagination">
                <span>
                    Hiển thị {transactions.length} / {pagination.total} giao dịch
                </span>

                <div className="borrow-pagination-controls">
                    <button
                        type="button"
                        onClick={handlePreviousPage}
                        disabled={
                            loading ||
                            pagination.page <= 1 ||
                            pagination.totalPages === 0
                        }
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <span>
                        Trang {pagination.totalPages === 0 ? 0 : pagination.page}
                        {" / "}
                        {pagination.totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={
                            loading ||
                            pagination.page >= pagination.totalPages ||
                            pagination.totalPages === 0
                        }
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
            
            {/* CREATE TRANSACTION MODAL */}
            {showCreateModal && (
                <div
                    className="borrow-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creating) {
                            setShowCreateModal(false);
                            setCreateError("");
                        }
                    }}
                >
                    <div className="borrow-modal borrow-create-modal">
                        <div className="borrow-modal-header">
                            <div>
                                <h2>Tạo phiếu mượn sách</h2>
                                <p>Nhập thông tin người mượn và bản sao sách.</p>
                            </div>

                            <button
                                type="button"
                                className="borrow-modal-close"
                                disabled={creating}
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateError("");
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            className="borrow-create-form"
                            onSubmit={handleCreateTransaction}
                        >
                            <div className="borrow-form-group">
                                <label htmlFor="borrower-barcode">
                                    Barcode người mượn
                                </label>

                                <input
                                    id="borrower-barcode"
                                    type="text"
                                    maxLength={50}
                                    placeholder="Nhập barcode người mượn"
                                    value={borrowerBarcode}
                                    onChange={(event) =>
                                        setBorrowerBarcode(event.target.value)
                                    }
                                    required
                                    disabled={creating}
                                />
                            </div>

                            <div className="borrow-form-group">
                                <label htmlFor="copy-barcode">
                                    Barcode bản sao sách
                                </label>

                                <input
                                    id="copy-barcode"
                                    type="text"
                                    maxLength={50}
                                    placeholder="Nhập barcode bản sao sách"
                                    value={copyBarcode}
                                    onChange={(event) =>
                                        setCopyBarcode(event.target.value)
                                    }
                                    required
                                    disabled={creating}
                                />
                            </div>

                            {createError && (
                                <div className="borrow-error">
                                    {createError}
                                </div>
                            )}

                            <div className="borrow-create-actions">
                                <button
                                    type="button"
                                    className="borrow-cancel-button"
                                    disabled={creating}
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateError("");
                                    }}
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    className="borrow-create-button"
                                    disabled={creating}
                                >
                                    {creating
                                        ? "Đang xử lý..."
                                        : "Xác nhận mượn"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedId !== null && (
                <div
                    className="borrow-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDetail();
                        }
                    }}
                >
                    <div className="borrow-modal">
                        <div className="borrow-modal-header">
                            <div>
                                <h2>Chi tiết giao dịch</h2>
                                <p>Giao dịch #{selectedId}</p>
                            </div>

                            <button
                                type="button"
                                className="borrow-modal-close"
                                onClick={closeDetail}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="borrow-state">
                                Đang tải thông tin giao dịch...
                            </div>
                        ) : detailError ? (
                            <div className="borrow-error">
                                {detailError}
                            </div>
                        ) : selectedTransaction ? (
                            <div className="borrow-detail-content">

                                <section className="borrow-detail-section">
                                    <h3>Thông tin giao dịch</h3>

                                    <div className="borrow-detail-grid">
                                        <div>
                                            <label>Mã giao dịch</label>
                                            <strong>
                                                #{selectedTransaction.transaction_id}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Trạng thái</label>
                                            <span
                                                className={`borrow-status borrow-status-${selectedTransaction.transaction_status.toLowerCase()}`}
                                            >
                                                {statusLabels[selectedTransaction.transaction_status]}
                                            </span>
                                        </div>

                                        <div>
                                            <label>Ngày mượn</label>
                                            <strong>
                                                {formatDate(selectedTransaction.borrow_date)}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Ngày đến hạn</label>
                                            <strong>
                                                {formatDate(selectedTransaction.due_date)}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Ngày trả</label>
                                            <strong>
                                                {formatDate(selectedTransaction.return_date)}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Thủ thư xử lý</label>
                                            <strong>
                                                {selectedTransaction.librarian_name}
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="borrow-detail-section">
                                    <h3>Thông tin người mượn</h3>

                                    <div className="borrow-detail-grid">
                                        <div>
                                            <label>Họ và tên</label>
                                            <strong>
                                                {selectedTransaction.borrower_name}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Mã người mượn</label>
                                            <strong>
                                                {selectedTransaction.barcode}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Email</label>
                                            <strong>
                                                {selectedTransaction.borrower_email}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Vai trò</label>
                                            <strong>
                                                {selectedTransaction.role_name}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Trạng thái tài khoản</label>
                                            <strong>
                                                {selectedTransaction.borrower_status}
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="borrow-detail-section">
                                    <h3>Thông tin sách</h3>

                                    <div className="borrow-detail-grid">
                                        <div>
                                            <label>Tên sách</label>
                                            <strong>
                                                {selectedTransaction.book_title}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Tác giả</label>
                                            <strong>
                                                {selectedTransaction.author || "Chưa cập nhật"}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Mã ISBN</label>
                                            <strong>
                                                {selectedTransaction.isbn || "Chưa cập nhật"}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Thể loại</label>
                                            <strong>
                                                {selectedTransaction.category || "Chưa cập nhật"}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Nhà xuất bản</label>
                                            <strong>
                                                {selectedTransaction.publisher || "Chưa cập nhật"}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Mã bản sao</label>
                                            <strong>
                                                {selectedTransaction.copy_barcode}
                                            </strong>
                                        </div>

                                        <div>
                                            <label>Trạng thái bản sao</label>
                                            <strong>
                                                {selectedTransaction.copy_status}
                                            </strong>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BorrowTransactions;