
const express = require("express");

const router = express.Router();

const {
    authenticateToken
} = require("../middlewares/auth.middleware");

const {
    getBorrowTransactions,
    getBorrowTransactionById,
    createBorrowTransaction
} = require("../controllers/borrowTransactions.controller");

// GET /api/borrow-transactions
// Lấy danh sách giao dịch mượn trả
router.get(
    "/",
    authenticateToken,
    getBorrowTransactions
);

// GET /api/borrow-transactions/:id
// Lấy chi tiết một giao dịch
router.get(
    "/:id",
    authenticateToken,
    getBorrowTransactionById
);

// POST /api/borrow-transactions
// Tạo phiếu mượn sách
router.post(
    "/",
    authenticateToken,
    createBorrowTransaction
);

module.exports = router;