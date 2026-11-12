const {
    getBooks: getBooksService,
    getBookById: getBookByIdService,
    createBook: createBookService,
    updateBook: updateBookService
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
    createBook,
    updateBook
};