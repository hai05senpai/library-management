import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Trash2,
    X,
    Pencil
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface Book {
    book_id: number;
    isbn: string | null;
    title: string;
    author: string;
    category: string | null;
    publisher: string | null;
    published_year: number | null;
    description: string | null;
    created_at: string;
    total_copies: number;
    available_copies: number;
}

interface BookDetailResponse {
    success: boolean;
    message: string;
    data: Book;
}
interface BooksResponse {
    success: boolean;
    message: string;
    data: {
        books: Book[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
}

interface BookCopy {
    copy_id: number;
    book_id: number;
    copy_barcode: string;
    status: "AVAILABLE" | "BORROWED" | "LOST" | "DAMAGED";
    created_at: string;
}

interface BookCopiesResponse {
    success: boolean;
    message: string;
    data: BookCopy[];
}
interface CreateBookForm {
    isbn: string;
    title: string;
    author: string;
    category: string;
    publisher: string;
    published_year: string;
    description: string;
}

interface ToastMessage {
    type: "success" | "error";
    message: string;
}

function Books() {
    const { account } = useAuth();

    const [books, setBooks] = useState<Book[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBooks, setTotalBooks] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const limit = 10;

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formError, setFormError] = useState("");

    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
    const [isLoadingCopies, setIsLoadingCopies] = useState(false);
    const [copiesError, setCopiesError] = useState("");

    const [isUpdatingCopyId, setIsUpdatingCopyId] = useState<number | null>(null);

    const [copyBarcode, setCopyBarcode] = useState("");
    const [isCreatingCopy, setIsCreatingCopy] = useState(false);
    const [createCopyError, setCreateCopyError] = useState("");
    const [createCopySuccess, setCreateCopySuccess] = useState("");

    const [editingBookId, setEditingBookId] = useState<number | null>(null);

    const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
    const [deleteBookError, setDeleteBookError] = useState("");

    const [toast, setToast] = useState<ToastMessage | null>(null);

    const [formData, setFormData] = useState<CreateBookForm>({
        isbn: "",
        title: "",
        author: "",
        category: "",
        publisher: "",
        published_year: "",
        description: ""
    });

    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get<BooksResponse>("/books", {
                    params: {
                        search: searchTerm,
                        page: currentPage,
                        limit
                    }
                });

                const result = response.data.data;

                setBooks(result.books);
                setTotalBooks(result.pagination.total);
                setTotalPages(result.pagination.totalPages);
            } catch (err: unknown) {
                console.error("Fetch books error:", err);
                setError("Không thể tải danh sách sách. Vui lòng thử lại.");
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [searchTerm, currentPage, refreshKey]);

    const fetchBookCopies = async (bookId: number) => {
        try {
            setIsLoadingCopies(true);
            setCopiesError("");
            setBookCopies([]);

            const response = await api.get<BookCopiesResponse>(
                `/books/${bookId}/copies`
            );

            setBookCopies(response.data.data);
        } catch (err: unknown) {
            console.error("Fetch book copies error:", err);
            setCopiesError("Không thể tải danh sách bản sao sách.");
        } finally {
            setIsLoadingCopies(false);
        }
    };

    const showToast = (
        type: "success" | "error",
        message: string
    ) => {
        setToast({ type, message });
    };

    const handleDeleteBook = async (book: Book) => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa đầu sách "${book.title}" không?\n\n` +
            "Thao tác này không thể hoàn tác."
        );

        if (!confirmed) return;

        try {
            setDeletingBookId(book.book_id);
            setDeleteBookError("");

            await api.delete(`/books/${book.book_id}`);
            showToast("success", `Đã xóa đầu sách "${book.title}" thành công.`);

            // Đóng modal chi tiết nếu đang xem đầu sách vừa xóa.
            if (selectedBook?.book_id === book.book_id) {
                setSelectedBook(null);
                setBookCopies([]);
            }

            // Làm mới danh sách đầu sách.
            setRefreshKey((key) => key + 1);

        } catch (err: unknown) {
            console.error("Delete book error:", err);

            if (
                typeof err === "object" &&
                err !== null &&
                "response" in err
            ) {
                const axiosError = err as {
                    response?: {
                        status?: number;
                        data?: {
                            message?: string;
                        };
                    };
                };

                const status = axiosError.response?.status;
                const message = axiosError.response?.data?.message;

                if (status === 404) {
                    showToast("error", "Không tìm thấy đầu sách cần xóa.");
                } else if (status === 409) {
                    if (message?.includes("book copies")) {
                        showToast(
                            "error",
                            "Không thể xóa đầu sách vì đã có bản sao sách."
                        );
                    } else if (message?.includes("transaction history")) {
                        showToast(
                            "error",
                            "Không thể xóa đầu sách vì đã có lịch sử giao dịch."
                        );
                    } else {
                        showToast(
                            "error",
                            "Không thể xóa đầu sách do vi phạm ràng buộc dữ liệu."
                        );
                    }
                } else {
                    showToast("error", "Không thể xóa đầu sách. Vui lòng thử lại.");
                }
            } else {
                setDeleteBookError(
                    "Không thể kết nối đến máy chủ. Vui lòng thử lại."
                );
            }
        } finally {
            setDeletingBookId(null);
        }
    };


    const handleCreateBookCopy = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!selectedBook) return;

        const barcode = copyBarcode.trim();

        if (!barcode) {
            setCreateCopyError("Vui lòng nhập mã bản sao.");
            return;
        }

        try {
            setIsCreatingCopy(true);
            setCreateCopyError("");
            setCreateCopySuccess("");

            await api.post(`/books/${selectedBook.book_id}/copies`, {
                copy_barcode: barcode
            });

            showToast("success", "Thêm bản sao sách thành công.");

            setCopyBarcode("");
            setCreateCopySuccess("Thêm bản sao thành công.");

            // Tải lại danh sách bản sao
            await fetchBookCopies(selectedBook.book_id);

            // Cập nhật số lượng bản sao của đầu sách
            const response = await api.get<BookDetailResponse>(
                `/books/${selectedBook.book_id}`
            );

            setSelectedBook(response.data.data);

            // Cập nhật danh sách sách bên ngoài modal
            setRefreshKey((key) => key + 1);
        } catch (err: unknown) {
            console.error("Create book copy error:", err);

            if (
                typeof err === "object" &&
                err !== null &&
                "response" in err
            ) {
                const axiosError = err as {
                    response?: {
                        status?: number;
                    };
                };

                if (axiosError.response?.status === 409) {
                    setCreateCopyError("Mã bản sao đã tồn tại.");
                    showToast("error", "Mã bản sao đã tồn tại.");
                } else {
                    setCreateCopyError("Không thể thêm bản sao. Vui lòng thử lại.");
                    showToast("error", "Không thể thêm bản sao. Vui lòng thử lại.");
                }
            } else {
                setCreateCopyError("Không thể thêm bản sao. Vui lòng thử lại.");
                showToast("error", "Không thể thêm bản sao. Vui lòng thử lại.");
            }
        } finally {
            setIsCreatingCopy(false);
        }
    };

    const handleUpdateCopyStatus = async (
        copyId: number,
        status: "AVAILABLE" | "LOST" | "DAMAGED"
    ) => {
        try {
            setIsUpdatingCopyId(copyId);

            await api.put(`/books/copies/${copyId}`, {
                status
            });

            showToast("success", "Cập nhật trạng thái bản sao thành công.");

            // Tải lại danh sách bản sao
            if (selectedBook) {
                await fetchBookCopies(selectedBook.book_id);

                // Cập nhật lại số lượng bản sao của đầu sách
                const response = await api.get<BookDetailResponse>(
                    `/books/${selectedBook.book_id}`
                );

                setSelectedBook(response.data.data);
            }

            // Cập nhật lại danh sách đầu sách bên ngoài modal
            setRefreshKey((key) => key + 1);
        } catch (err: unknown) {
            console.error("Update book copy status error:", err);

            const message = "Không thể cập nhật trạng thái bản sao. Vui lòng thử lại.";

            setCopiesError(message);
            showToast("error", message);
        } finally {
            setIsUpdatingCopyId(null);
        }
    };
    
    const handleViewBook = async (bookId: number) => {
        try {
            setShowDetailModal(true);
            setIsLoadingDetail(true);
            setDetailError("");
            setSelectedBook(null);
            setBookCopies([]);
            setCopiesError("");

            const response = await api.get<BookDetailResponse>(
                `/books/${bookId}`
            );

            setSelectedBook(response.data.data);

            await fetchBookCopies(bookId);
        } catch (err: unknown) {
            console.error("Get book detail error:", err);
            setDetailError("Không thể tải thông tin sách. Vui lòng thử lại.");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleEditBook = async (bookId: number) => {
        try {
            setIsLoadingDetail(true);
            setDetailError("");
            setSelectedBook(null);

            const response = await api.get<BookDetailResponse>(
                `/books/${bookId}`
            );

            const book = response.data.data;

            setFormData({
                isbn: book.isbn || "",
                title: book.title,
                author: book.author,
                category: book.category || "",
                publisher: book.publisher || "",
                published_year: book.published_year?.toString() || "",
                description: book.description || ""
            });

            setEditingBookId(bookId);
            setFormError("");
            setShowCreateModal(true);
        } catch (err: unknown) {
            console.error("Get book for editing error:", err);
            setError("Không thể tải thông tin sách để chỉnh sửa.");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleCreateBook = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.title.trim() || !formData.author.trim()) {
            setFormError("Vui lòng nhập tên sách và tác giả.");
            return;
        }

        const year = formData.published_year.trim();

        if (year && (!/^\d+$/.test(year) || Number(year) < 1 || Number(year) > 9999)) {
            setFormError("Năm xuất bản phải là số nguyên hợp lệ.");
            return;
        }

        try {
            setIsCreating(true);
            setFormError("");

            const payload = {
                isbn: formData.isbn.trim() || null,
                title: formData.title.trim(),
                author: formData.author.trim(),
                category: formData.category.trim() || null,
                publisher: formData.publisher.trim() || null,
                published_year: year ? Number(year) : null,
                description: formData.description.trim() || null
            };

            if (editingBookId !== null) {
                await api.put(`/books/${editingBookId}`, payload);
                showToast("success", "Cập nhật đầu sách thành công.");
            } else {
                await api.post("/books", payload);
                showToast("success", "Thêm đầu sách thành công.");
            }

            setFormData({
                isbn: "",
                title: "",
                author: "",
                category: "",
                publisher: "",
                published_year: "",
                description: ""
            });

            setShowCreateModal(false);
            setCurrentPage(1);
            setSearchInput("");
            setSearchTerm("");
            setRefreshKey((key) => key + 1);
            setEditingBookId(null);
        } catch (err: unknown) {
            console.error("Create book error:", err);
            const message = editingBookId !== null
                ? "Không thể cập nhật đầu sách. Vui lòng thử lại."
                : "Không thể thêm đầu sách. Vui lòng thử lại.";

            setFormError(message);
            showToast("error", message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCurrentPage(1);
        setSearchTerm(searchInput.trim());
    };

    const canManageBooks =
        account?.role === "ADMIN" || account?.role === "LIBRARIAN";


    const dashboardPaths: Record<string, string> = {
        STUDENT: "/dashboard/student",
        LECTURER: "/dashboard/lecturer",
        LIBRARIAN: "/dashboard/librarian",
        ADMIN: "/dashboard/admin"
    };

    const dashboardPath = account
        ? dashboardPaths[account.role]
        : "/";

    return (
        <div className="books-page">
            {toast && (
                <div
                    className={`books-toast books-toast-${toast.type}`}
                    role="alert"
                >
                    <span>{toast.message}</span>

                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        aria-label="Đóng thông báo"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            <header className="books-header">
                <div>
                    <Link to={dashboardPath} className="books-back-link">
                        ← Quay lại Dashboard
                    </Link>
                    <h1>Quản lý sách</h1>
                    <p>Tra cứu và quản lý tài liệu trong thư viện.</p>
                </div>

                {canManageBooks && (
                    <button
                        className="books-add-button"
                        type="button"
                        onClick={() => {
                            setEditingBookId(null);
                            setFormError("");
                            setFormData({
                                isbn: "",
                                title: "",
                                author: "",
                                category: "",
                                publisher: "",
                                published_year: "",
                                description: ""
                            });
                            setShowCreateModal(true);
                        }}
                    >
                        + Thêm sách
                    </button>
                )}
            </header>

            <section className="books-toolbar">
                <form className="books-search-form" onSubmit={handleSearch}>
                    <Search size={20} />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Tìm theo tên sách, tác giả hoặc ISBN..."
                    />
                    <button type="submit">Tìm kiếm</button>
                </form>

                <span className="books-total">
                    Tổng cộng: <strong>{totalBooks}</strong> đầu sách
                </span>
            </section>
            
            {deleteBookError && (
                <div className="books-delete-error">
                    <span>{deleteBookError}</span>
                    <button
                        type="button"
                        onClick={() => setDeleteBookError("")}
                        aria-label="Đóng thông báo"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <section className="books-table-container">
                {loading ? (
                    <div className="books-state">Đang tải danh sách sách...</div>
                ) : error ? (
                    <div className="books-state books-error">{error}</div>
                ) : books.length === 0 ? (
                    <div className="books-state">
                        <BookOpen size={36} />
                        <p>Không tìm thấy sách phù hợp.</p>
                    </div>
                ) : (
                    <div className="books-table-scroll">
                        <table className="books-table">
                            <thead>
                                <tr>
                                    <th>ISBN</th>
                                    <th>Tên sách</th>
                                    <th>Tác giả</th>
                                    <th>Thể loại</th>
                                    <th>Nhà xuất bản</th>
                                    <th>Năm XB</th>
                                    <th>Tổng bản sao</th>
                                    <th>Có thể mượn</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {books.map((book) => (
                                    <tr key={book.book_id}>
                                        <td>{book.isbn || "—"}</td>
                                        <td className="books-title-cell">
                                            <button
                                                type="button"
                                                className="books-title-button"
                                                onClick={() => handleViewBook(book.book_id)}
                                            >
                                                {book.title}
                                            </button>
                                        </td>
                                        <td>{book.author}</td>
                                        <td>{book.category || "—"}</td>
                                        <td>{book.publisher || "—"}</td>
                                        <td>{book.published_year || "—"}</td>
                                        <td>{book.total_copies ?? 0}</td>
                                        <td>
                                            <span className="books-available">
                                                {book.available_copies ?? 0}
                                            </span>
                                        </td>
                                        <td>
                                            {canManageBooks && (
                                                <button
                                                    type="button"
                                                    className="books-action-button"
                                                    onClick={() => handleEditBook(book.book_id)}
                                                    title="Chỉnh sửa sách"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            )}
                                            {canManageBooks && (
                                                <button
                                                    type="button"
                                                    className="books-delete-button"
                                                    onClick={() => handleDeleteBook(book)}
                                                    disabled={deletingBookId === book.book_id}
                                                    title="Xóa đầu sách"
                                                    aria-label={`Xóa đầu sách ${book.title}`}
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <footer className="books-pagination">
                <span>
                    Trang {currentPage} / {totalPages}
                </span>

                <div className="books-pagination-actions">
                    <button
                        type="button"
                        disabled={currentPage <= 1 || loading}
                        onClick={() => setCurrentPage((page) => page - 1)}
                        aria-label="Trang trước"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                        type="button"
                        disabled={currentPage >= totalPages || loading}
                        onClick={() => setCurrentPage((page) => page + 1)}
                        aria-label="Trang sau"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </footer>
            
            {showDetailModal && (
                <div
                    className="books-modal-overlay"
                    onClick={() => setShowDetailModal(false)}
                >
                    <div
                        className="books-modal books-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="book-detail-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="books-modal-header">
                            <div>
                                <h2 id="book-detail-title">Chi tiết sách</h2>
                                <p>Thông tin chi tiết về đầu sách trong thư viện.</p>
                            </div>

                            <button
                                type="button"
                                className="books-modal-close"
                                onClick={() => setShowDetailModal(false)}
                                aria-label="Đóng"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isLoadingDetail ? (
                            <div className="books-state">
                                Đang tải thông tin sách...
                            </div>
                        ) : detailError ? (
                            <div className="books-state books-error">
                                {detailError}
                            </div>
                        ) : selectedBook ? (
                            <div className="books-detail-content">
                                <div className="books-detail-title">
                                    <div className="books-detail-icon">
                                        <BookOpen size={28} />
                                    </div>

                                    <div>
                                        <h3>{selectedBook.title}</h3>
                                        <p>{selectedBook.author}</p>
                                    </div>
                                </div>

                                <div className="books-detail-grid">
                                    <div className="books-detail-item">
                                        <span>ISBN</span>
                                        <strong>{selectedBook.isbn || "—"}</strong>
                                    </div>

                                    <div className="books-detail-item">
                                        <span>Thể loại</span>
                                        <strong>{selectedBook.category || "—"}</strong>
                                    </div>

                                    <div className="books-detail-item">
                                        <span>Nhà xuất bản</span>
                                        <strong>{selectedBook.publisher || "—"}</strong>
                                    </div>

                                    <div className="books-detail-item">
                                        <span>Năm xuất bản</span>
                                        <strong>{selectedBook.published_year || "—"}</strong>
                                    </div>

                                    <div className="books-detail-item">
                                        <span>Tổng số bản sao</span>
                                        <strong>{selectedBook.total_copies ?? 0}</strong>
                                    </div>

                                    <div className="books-detail-item">
                                        <span>Số bản có thể mượn</span>
                                        <strong className="books-available">
                                            {selectedBook.available_copies ?? 0}
                                        </strong>
                                    </div>
                                </div>

                                <div className="books-detail-description">
                                    <span>Mô tả</span>
                                    <p>
                                        {selectedBook.description || "Chưa có mô tả cho sách này."}
                                    </p>
                                </div>

                                {canManageBooks && (
                                    <div className="books-add-copy-section">
                                        <h3>Thêm bản sao sách</h3>

                                        <form
                                            className="books-add-copy-form"
                                            onSubmit={handleCreateBookCopy}
                                        >
                                            <div className="books-add-copy-input">
                                                <label htmlFor="copy-barcode">
                                                    Mã bản sao
                                                </label>

                                                <input
                                                    id="copy-barcode"
                                                    type="text"
                                                    value={copyBarcode}
                                                    onChange={(event) => {
                                                        setCopyBarcode(event.target.value);
                                                        setCreateCopyError("");
                                                        setCreateCopySuccess("");
                                                    }}
                                                    placeholder="Ví dụ: COPY0006"
                                                    maxLength={50}
                                                    disabled={isCreatingCopy}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                className="books-add-copy-button"
                                                disabled={isCreatingCopy}
                                            >
                                                {isCreatingCopy ? "Đang thêm..." : "+ Thêm bản sao"}
                                            </button>
                                        </form>

                                        {createCopyError && (
                                            <p className="books-add-copy-error">
                                                {createCopyError}
                                            </p>
                                        )}

                                        {createCopySuccess && (
                                            <p className="books-add-copy-success">
                                                {createCopySuccess}
                                            </p>
                                        )}

                                        <p className="books-add-copy-note">
                                            Bản sao mới sẽ được tạo với trạng thái Có thể mượn.
                                        </p>
                                    </div>
                                )}

                                <div className="books-detail-copies">
                                    <div className="books-detail-section-header">
                                        <h3>Danh sách bản sao</h3>
                                        <span>{bookCopies.length} bản sao</span>
                                    </div>

                                    {isLoadingCopies ? (
                                        <div className="books-state">
                                            Đang tải danh sách bản sao...
                                        </div>
                                    ) : copiesError ? (
                                        <div className="books-state books-error">
                                            {copiesError}
                                        </div>
                                    ) : bookCopies.length === 0 ? (
                                        <div className="books-state">
                                            Chưa có bản sao nào cho đầu sách này.
                                        </div>
                                    ) : (
                                        <div className="books-copies-table-scroll">
                                            <table className="books-copies-table">
                                                <thead>
                                                    <tr>
                                                        <th>Mã bản sao</th>
                                                        <th>Trạng thái</th>
                                                        <th>Ngày tạo</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {bookCopies.map((copy) => (
                                                        <tr key={copy.copy_id}>
                                                            <td>{copy.copy_barcode}</td>

                                                            <td>
                                                                {canManageBooks && copy.status !== "BORROWED" ? (
                                                                    <select
                                                                        className="books-copy-status-select"
                                                                        value={copy.status}
                                                                        disabled={isUpdatingCopyId === copy.copy_id}
                                                                        onChange={(event) =>
                                                                            handleUpdateCopyStatus(
                                                                                copy.copy_id,
                                                                                event.target.value as "AVAILABLE" | "LOST" | "DAMAGED"
                                                                            )
                                                                        }
                                                                    >
                                                                        <option value="AVAILABLE">Có thể mượn</option>
                                                                        <option value="LOST">Đã mất</option>
                                                                        <option value="DAMAGED">Hư hỏng</option>
                                                                    </select>
                                                                ) : (
                                                                    <span
                                                                        className={`books-copy-status status-${copy.status.toLowerCase()}`}
                                                                    >
                                                                        {copy.status === "AVAILABLE"
                                                                            ? "Có thể mượn"
                                                                            : copy.status === "BORROWED"
                                                                                ? "Đang được mượn"
                                                                                : copy.status === "LOST"
                                                                                    ? "Đã mất"
                                                                                    : "Hư hỏng"}
                                                                    </span>
                                                                )}

                                                                {isUpdatingCopyId === copy.copy_id && (
                                                                    <span className="books-copy-updating">
                                                                        Đang cập nhật...
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td>
                                                                {new Date(copy.created_at).toLocaleDateString("vi-VN")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="books-detail-footer">
                                    <span>
                                        Ngày tạo:{" "}
                                        {new Date(selectedBook.created_at).toLocaleDateString("vi-VN")}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
            
            {showCreateModal && (
                <div className="books-modal-overlay">
                    <div
                        className="books-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-book-title"
                    >
                        <div className="books-modal-header">
                            <div>
                                <h2 id="create-book-title">
                                    {editingBookId !== null ? "Chỉnh sửa đầu sách" : "Thêm đầu sách"}
                                </h2>
                                <p>Nhập thông tin tài liệu mới vào thư viện.</p>
                            </div>

                            <button
                                type="button"
                                className="books-modal-close"
                                onClick={() => setShowCreateModal(false)}
                                disabled={isCreating}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateBook}>
                            <div className="books-form-grid">
                                <div className="books-form-group">
                                    <label htmlFor="book-title">
                                        Tên sách <span>*</span>
                                    </label>
                                    <input
                                        id="book-title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                title: event.target.value
                                            })
                                        }
                                        maxLength={255}
                                        required
                                    />
                                </div>

                                <div className="books-form-group">
                                    <label htmlFor="book-author">
                                        Tác giả <span>*</span>
                                    </label>
                                    <input
                                        id="book-author"
                                        type="text"
                                        value={formData.author}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                author: event.target.value
                                            })
                                        }
                                        maxLength={255}
                                        required
                                    />
                                </div>

                                <div className="books-form-group">
                                    <label htmlFor="book-isbn">ISBN</label>
                                    <input
                                        id="book-isbn"
                                        type="text"
                                        value={formData.isbn}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                isbn: event.target.value
                                            })
                                        }
                                        maxLength={20}
                                    />
                                </div>

                                <div className="books-form-group">
                                    <label htmlFor="book-category">Thể loại</label>
                                    <input
                                        id="book-category"
                                        type="text"
                                        value={formData.category}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                category: event.target.value
                                            })
                                        }
                                        maxLength={100}
                                    />
                                </div>

                                <div className="books-form-group">
                                    <label htmlFor="book-publisher">Nhà xuất bản</label>
                                    <input
                                        id="book-publisher"
                                        type="text"
                                        value={formData.publisher}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                publisher: event.target.value
                                            })
                                        }
                                        maxLength={150}
                                    />
                                </div>

                                <div className="books-form-group">
                                    <label htmlFor="book-year">Năm xuất bản</label>
                                    <input
                                        id="book-year"
                                        type="number"
                                        min="1"
                                        max="9999"
                                        value={formData.published_year}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                published_year: event.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="books-form-group books-form-full">
                                    <label htmlFor="book-description">Mô tả</label>
                                    <textarea
                                        id="book-description"
                                        rows={4}
                                        value={formData.description}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                description: event.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="books-form-error">
                                    {formError}
                                </div>
                            )}

                            <div className="books-modal-actions">
                                <button
                                    type="button"
                                    className="books-cancel-button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={isCreating}
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    className="books-submit-button"
                                    disabled={isCreating}
                                >
                                    {isCreating
                                        ? "Đang lưu..."
                                        : editingBookId !== null
                                            ? "Cập nhật sách"
                                            : "Lưu đầu sách"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Books;