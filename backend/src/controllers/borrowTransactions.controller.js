
const borrowTransactionsService = require("../services/borrowTransactions.service");

const ALLOWED_ROLES = ["ADMIN", "LIBRARIAN", "STUDENT", "LECTURER"];
const BORROWER_ROLES = ["STUDENT", "LECTURER"];
const ALLOWED_STATUSES = ["BORROWED", "OVERDUE", "RETURNED"];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// GET /api/borrow-transactions
const getBorrowTransactions = async (req, res) => {
    try {
        const { role, accountId } = req.user;

        // 1. Kiểm tra role
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền xem danh sách giao dịch."
            });
        }

        // 2. Validate page
        const page = req.query.page === undefined
            ? DEFAULT_PAGE
            : Number(req.query.page);

        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({
                success: false,
                message: "Tham số page phải là số nguyên lớn hơn hoặc bằng 1."
            });
        }

        // 3. Validate limit
        const limit = req.query.limit === undefined
            ? DEFAULT_LIMIT
            : Number(req.query.limit);

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > MAX_LIMIT
        ) {
            return res.status(400).json({
                success: false,
                message: `Tham số limit phải là số nguyên từ 1 đến ${MAX_LIMIT}.`
            });
        }

        // 4. Validate search
        let search = req.query.search;

        if (search !== undefined) {
            if (typeof search !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Tham số search không hợp lệ."
                });
            }

            search = search.trim();

            if (search.length > 255) {
                return res.status(400).json({
                    success: false,
                    message: "Tham số search không được vượt quá 255 ký tự."
                });
            }

            if (search === "") {
                search = undefined;
            }
        }

        // 5. Validate status
        let status = req.query.status;

        if (status !== undefined) {
            if (typeof status !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Tham số status không hợp lệ."
                });
            }

            status = status.trim().toUpperCase();

            if (!ALLOWED_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status chỉ được nhận BORROWED, OVERDUE hoặc RETURNED."
                });
            }
        }

        // 6. Xác định phạm vi dữ liệu theo role
        // Borrower chỉ được xem giao dịch của chính mình.
        // Không lấy borrowerId từ query string.
        const borrowerId = BORROWER_ROLES.includes(role)
            ? accountId
            : null;

        const dbPool = req.app.locals.dbPool;

        const result = await borrowTransactionsService.getBorrowTransactions(
            dbPool,
            {
                search,
                status,
                page,
                limit,
                borrowerId
            }
        );

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách giao dịch thành công.",
            data: result
        });
    } catch (error) {
        console.error("getBorrowTransactions error:", error);

        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy danh sách giao dịch."
        });
    }
};

// GET /api/borrow-transactions/:id
const getBorrowTransactionById = async (req, res) => {
    try {
        const { role, accountId } = req.user;

        // 1. Kiểm tra role
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền xem chi tiết giao dịch."
            });
        }

        // 2. Validate transaction ID
        const transactionId = Number(req.params.id);

        if (!Number.isInteger(transactionId) || transactionId < 1) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID phải là số nguyên dương."
            });
        }

        // 3. Xác định phạm vi dữ liệu theo role
        const borrowerId = BORROWER_ROLES.includes(role)
            ? accountId
            : null;

        const dbPool = req.app.locals.dbPool;

        const transaction =
            await borrowTransactionsService.getBorrowTransactionById(
                dbPool,
                transactionId,
                borrowerId
            );

        // Trả về 404 nếu không tồn tại hoặc borrower không sở hữu giao dịch.
        // Cách này tránh tiết lộ giao dịch của người khác.
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lấy chi tiết giao dịch thành công.",
            data: transaction
        });
    } catch (error) {
        console.error("getBorrowTransactionById error:", error);

        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy chi tiết giao dịch."
        });
    }
};

// POST /api/borrow-transactions
const createBorrowTransaction = async (req, res) => {
    try {
        const { role, accountId } = req.user;

        // 1. Chỉ thủ thư được phép tạo phiếu mượn.
        if (role !== "LIBRARIAN") {
            return res.status(403).json({
                success: false,
                message: "Chỉ thủ thư mới có quyền tạo phiếu mượn."
            });
        }

        // 2. Validate borrower barcode.
        const borrowerBarcode =
            typeof req.body?.borrowerBarcode === "string"
                ? req.body.borrowerBarcode.trim()
                : "";

        if (!borrowerBarcode) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập barcode người mượn."
            });
        }

        if (borrowerBarcode.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Barcode người mượn không được vượt quá 50 ký tự."
            });
        }

        // 3. Validate book copy barcode.
        const copyBarcode =
            typeof req.body?.copyBarcode === "string"
                ? req.body.copyBarcode.trim()
                : "";

        if (!copyBarcode) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập barcode bản sao sách."
            });
        }

        if (copyBarcode.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Barcode bản sao sách không được vượt quá 50 ký tự."
            });
        }

        // 4. Lấy librarianId từ JWT.
        const librarianId = Number(accountId);

        if (!Number.isInteger(librarianId) || librarianId < 1) {
            return res.status(401).json({
                success: false,
                message: "Thông tin tài khoản thủ thư không hợp lệ."
            });
        }

        // 5. Gọi service.
        const dbPool = req.app.locals.dbPool;

        const createdTransaction =
            await borrowTransactionsService.createBorrowTransaction(
                dbPool,
                {
                    borrowerBarcode,
                    copyBarcode,
                    librarianId
                }
            );

        return res.status(201).json({
            success: true,
            message: "Tạo phiếu mượn sách thành công.",
            data: createdTransaction
        });

    } catch (error) {
        console.error("createBorrowTransaction error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Đã xảy ra lỗi khi tạo phiếu mượn sách."
        });
    }
};

module.exports = {
    getBorrowTransactions,
    getBorrowTransactionById,
    createBorrowTransaction
};