
const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middlewares/auth.middleware");

const {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    getBookCopies,
    createBookCopy,
    updateBookCopy
} = require("../controllers/books.controller");

// Tất cả người dùng đã đăng nhập được xem sách.
router.get("/", authenticateToken, getBooks);
router.get("/:id", authenticateToken, getBookById);
router.get("/:id/copies", authenticateToken, getBookCopies);

// Chỉ Admin và Thủ thư được quản lý sách.
router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "LIBRARIAN"),
    createBook
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "LIBRARIAN"),
    updateBook
);

// router.delete(
//     "/:id",
//     authenticateToken,
//     authorizeRoles("ADMIN", "LIBRARIAN"),
//     deleteBook
// );

router.post(
    "/:id/copies",
    authenticateToken,
    authorizeRoles("ADMIN", "LIBRARIAN"),
    createBookCopy
);

router.put(
    "/copies/:copyId",
    authenticateToken,
    authorizeRoles("ADMIN", "LIBRARIAN"),
    updateBookCopy
);

module.exports = router;