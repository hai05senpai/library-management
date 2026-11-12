const {
    getBooks: getBooksService,
    getBookById: getBookByIdService,
    createBook: createBookService,
    updateBook: updateBookService,
    getBookCopies: getBookCopiesService,
    createBookCopy: createBookCopyService,
    updateBookCopy: updateBookCopyService
} = require("../services/books.service");

const getBooks = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters."
            });
        }

        const result = await getBooksService(dbPool, {
            search,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: "Books retrieved successfully.",
            data: result
        });
    } catch (error) {
        console.error("Get books error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve books."
        });
    }
};

const getBookById = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;
        const bookId = Number(req.params.id);

        if (!Number.isInteger(bookId) || bookId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID."
            });
        }

        const book = await getBookByIdService(dbPool, bookId);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Book retrieved successfully.",
            data: book
        });
    } catch (error) {
        console.error("Get book detail error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve book."
        });
    }
};

const getBookCopies = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;
        const bookId = Number(req.params.id);

        // Validate book ID
        if (!Number.isInteger(bookId) || bookId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID."
            });
        }

        // Check whether the book exists
        const book = await getBookByIdService(dbPool, bookId);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found."
            });
        }

        // Retrieve book copies
        const copies = await getBookCopiesService(dbPool, bookId);

        return res.status(200).json({
            success: true,
            message: "Book copies retrieved successfully.",
            data: copies
        });
    } catch (error) {
        console.error("Get book copies error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve book copies."
        });
    }
};

const createBookCopy = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;
        const bookId = Number(req.params.id);
        const { copy_barcode } = req.body;

        // Validate book ID
        if (!Number.isInteger(bookId) || bookId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID."
            });
        }

        // Validate copy barcode
        if (
            typeof copy_barcode !== "string" ||
            !copy_barcode.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Copy barcode is required."
            });
        }

        const normalizedBarcode = copy_barcode.trim();

        if (normalizedBarcode.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Copy barcode must not exceed 50 characters."
            });
        }

        // Check whether the book exists
        const book = await getBookByIdService(dbPool, bookId);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found."
            });
        }

        // Create book copy
        const copy = await createBookCopyService(
            dbPool,
            bookId,
            normalizedBarcode
        );

        return res.status(201).json({
            success: true,
            message: "Book copy created successfully.",
            data: copy
        });
    } catch (error) {
        console.error("Create book copy error:", error.message);

        // Handle duplicate barcode
        if (error.number === 2601 || error.number === 2627) {
            return res.status(409).json({
                success: false,
                message: "Copy barcode already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create book copy."
        });
    }
};

const updateBookCopy = async (req, res) => {
    try {
        const copyId = Number(req.params.copyId);
        const { status } = req.body;

        // Validate copy ID
        if (!Number.isInteger(copyId) || copyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid copy ID."
            });
        }

        // Only allow these statuses
        const allowedStatuses = ["AVAILABLE", "LOST", "DAMAGED"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be AVAILABLE, LOST, or DAMAGED."
            });
        }

        const result = await updateBookCopyService(
            req.app.locals.dbPool,
            copyId,
            status
        );

        if (result.type === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Book copy not found."
            });
        }

        if (result.type === "BORROWED") {
            return res.status(409).json({
                success: false,
                message: "Cannot update the status of a copy with an active loan."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Book copy status updated successfully.",
            data: result.copy
        });
    } catch (error) {
        console.error("Update book copy error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update book copy status."
        });
    }
};

const createBook = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;

        const {
            isbn,
            title,
            author,
            category,
            publisher,
            published_year,
            description
        } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof author !== "string" ||
            !author.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Title and author are required."
            });
        }

        if (
            isbn != null && typeof isbn !== "string" ||
            category != null && typeof category !== "string" ||
            publisher != null && typeof publisher !== "string" ||
            description != null && typeof description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid book field types."
            });
        }

        if (
            published_year !== undefined &&
            published_year !== null &&
            (
                !Number.isInteger(published_year) ||
                published_year < 1 ||
                published_year > 9999
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Published year must be a valid integer."
            });
        }

        const book = await createBookService(dbPool, {
            isbn: isbn?.trim() || null,
            title: title.trim(),
            author: author.trim(),
            category: category?.trim() || null,
            publisher: publisher?.trim() || null,
            published_year: published_year ?? null,
            description: description?.trim() || null
        });

        return res.status(201).json({
            success: true,
            message: "Book created successfully.",
            data: book
        });
    } catch (error) {
        console.error("Create book error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create book."
        });
    }
};

const updateBook = async (req, res) => {
    try {
        const dbPool = req.app.locals.dbPool;
        const bookId = Number(req.params.id);

        if (!Number.isInteger(bookId) || bookId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID."
            });
        }

        const {
            isbn,
            title,
            author,
            category,
            publisher,
            published_year,
            description
        } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof author !== "string" ||
            !author.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Title and author are required."
            });
        }

        if (
            (isbn != null && typeof isbn !== "string") ||
            (category != null && typeof category !== "string") ||
            (publisher != null && typeof publisher !== "string") ||
            (description != null && typeof description !== "string")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid book field types."
            });
        }

        if (
            published_year !== undefined &&
            published_year !== null &&
            (
                !Number.isInteger(published_year) ||
                published_year < 1 ||
                published_year > 9999
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Published year must be a valid integer."
            });
        }

        const book = await updateBookService(dbPool, bookId, {
            isbn: isbn?.trim() || null,
            title: title.trim(),
            author: author.trim(),
            category: category?.trim() || null,
            publisher: publisher?.trim() || null,
            published_year: published_year ?? null,
            description: description?.trim() || null
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Book updated successfully.",
            data: book
        });
    } catch (error) {
        console.error("Update book error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update book."
        });
    }
};

module.exports = {
    getBooks,
    getBookById,
    getBookCopies,
    createBook,
    updateBook,
    createBookCopy,
    updateBookCopy
};