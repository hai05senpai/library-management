
const { sql } = require("../config/database");

const getBooks = async (dbPool, { search, page, limit }) => {
    const offset = (page - 1) * limit;

    const request = dbPool.request();

    request.input("search", sql.NVarChar(255), search || null);
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);

    const countResult = await request.query(`
        SELECT COUNT(*) AS total
        FROM dbo.books
        WHERE
            @search IS NULL
            OR title LIKE N'%' + @search + N'%'
            OR author LIKE N'%' + @search + N'%'
            OR isbn LIKE '%' + @search + '%'
    `);

    const total = countResult.recordset[0].total;

    const booksResult = await request.query(`
        SELECT
            b.book_id,
            b.isbn,
            b.title,
            b.author,
            b.category,
            b.publisher,
            b.published_year,
            b.description,
            b.created_at,
            COUNT(bc.copy_id) AS total_copies,
            SUM(
                CASE
                    WHEN bc.status = 'AVAILABLE' THEN 1
                    ELSE 0
                END
            ) AS available_copies
        FROM dbo.books b
        LEFT JOIN dbo.book_copies bc
            ON b.book_id = bc.book_id
        WHERE
            @search IS NULL
            OR b.title LIKE N'%' + @search + N'%'
            OR b.author LIKE N'%' + @search + N'%'
            OR b.isbn LIKE '%' + @search + '%'
        GROUP BY
            b.book_id,
            b.isbn,
            b.title,
            b.author,
            b.category,
            b.publisher,
            b.published_year,
            b.description,
            b.created_at
        ORDER BY b.book_id DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
    `);

    return {
        books: booksResult.recordset,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getBookById = async (dbPool, bookId) => {
    const request = dbPool.request();

    request.input("bookId", sql.Int, bookId);

    const result = await request.query(`
        SELECT
            b.book_id,
            b.isbn,
            b.title,
            b.author,
            b.category,
            b.publisher,
            b.published_year,
            b.description,
            b.created_at,
            COUNT(bc.copy_id) AS total_copies,
            SUM(
                CASE
                    WHEN bc.status = 'AVAILABLE' THEN 1
                    ELSE 0
                END
            ) AS available_copies
        FROM dbo.books b
        LEFT JOIN dbo.book_copies bc
            ON b.book_id = bc.book_id
        WHERE b.book_id = @bookId
        GROUP BY
            b.book_id,
            b.isbn,
            b.title,
            b.author,
            b.category,
            b.publisher,
            b.published_year,
            b.description,
            b.created_at;
    `);

    return result.recordset[0] || null;
};

const getBookCopies = async (dbPool, bookId) => {
    const request = dbPool.request();

    request.input("bookId", sql.Int, bookId);

    const result = await request.query(`
        SELECT
            copy_id,
            book_id,
            copy_barcode,
            status,
            created_at
        FROM dbo.book_copies
        WHERE book_id = @bookId
        ORDER BY copy_id DESC;
    `);

    return result.recordset;
};

const createBook = async (dbPool, bookData) => {
    const {
        isbn,
        title,
        author,
        category,
        publisher,
        published_year,
        description
    } = bookData;

    const request = dbPool.request();

    request.input("isbn", sql.VarChar(20), isbn || null);
    request.input("title", sql.NVarChar(255), title);
    request.input("author", sql.NVarChar(255), author);
    request.input("category", sql.NVarChar(100), category || null);
    request.input("publisher", sql.NVarChar(150), publisher || null);
    request.input("published_year", sql.Int, published_year ?? null);
    request.input("description", sql.NVarChar(sql.MAX), description || null);

    const result = await request.query(`
        INSERT INTO dbo.books (
            isbn,
            title,
            author,
            category,
            publisher,
            published_year,
            description
        )
        OUTPUT
            INSERTED.book_id,
            INSERTED.isbn,
            INSERTED.title,
            INSERTED.author,
            INSERTED.category,
            INSERTED.publisher,
            INSERTED.published_year,
            INSERTED.description,
            INSERTED.created_at
        VALUES (
            @isbn,
            @title,
            @author,
            @category,
            @publisher,
            @published_year,
            @description
        );
    `);

    return result.recordset[0];
};

const updateBook = async (dbPool, bookId, bookData) => {
    const {
        isbn,
        title,
        author,
        category,
        publisher,
        published_year,
        description
    } = bookData;

    const request = dbPool.request();

    request.input("bookId", sql.Int, bookId);
    request.input("isbn", sql.VarChar(20), isbn || null);
    request.input("title", sql.NVarChar(255), title);
    request.input("author", sql.NVarChar(255), author);
    request.input("category", sql.NVarChar(100), category || null);
    request.input("publisher", sql.NVarChar(150), publisher || null);
    request.input("published_year", sql.Int, published_year ?? null);
    request.input("description", sql.NVarChar(sql.MAX), description || null);

    const result = await request.query(`
        UPDATE dbo.books
        SET
            isbn = @isbn,
            title = @title,
            author = @author,
            category = @category,
            publisher = @publisher,
            published_year = @published_year,
            description = @description
        OUTPUT
            INSERTED.book_id,
            INSERTED.isbn,
            INSERTED.title,
            INSERTED.author,
            INSERTED.category,
            INSERTED.publisher,
            INSERTED.published_year,
            INSERTED.description,
            INSERTED.created_at
        WHERE book_id = @bookId;
    `);

    return result.recordset[0] || null;
};

const createBookCopy = async (dbPool, bookId, copyBarcode) => {
    const request = dbPool.request();

    request.input("bookId", sql.Int, bookId);
    request.input("copyBarcode", sql.VarChar(50), copyBarcode);

    const result = await request.query(`
        INSERT INTO dbo.book_copies (
            book_id,
            copy_barcode,
            status
        )
        OUTPUT
            INSERTED.copy_id,
            INSERTED.book_id,
            INSERTED.copy_barcode,
            INSERTED.status,
            INSERTED.created_at
        VALUES (
            @bookId,
            @copyBarcode,
            'AVAILABLE'
        );
    `);

    return result.recordset[0];
};

const updateBookCopy = async (dbPool, copyId, status) => {
    const request = dbPool.request();

    request.input("copyId", sql.Int, copyId);
    request.input("status", sql.VarChar(20), status);

    const result = await request.query(`
        UPDATE bc
        SET status = @status
        OUTPUT
            INSERTED.copy_id,
            INSERTED.book_id,
            INSERTED.copy_barcode,
            INSERTED.status,
            INSERTED.created_at
        FROM dbo.book_copies AS bc
        WHERE bc.copy_id = @copyId
          AND bc.status <> 'BORROWED'
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.borrow_transactions AS bt
              WHERE bt.copy_id = bc.copy_id
                AND bt.status IN ('BORROWED', 'OVERDUE')
          );
    `);

    if (result.recordset.length > 0) {
        return {
            type: "UPDATED",
            copy: result.recordset[0]
        };
    }

    const checkResult = await dbPool.request()
        .input("copyId", sql.Int, copyId)
        .query(`
            SELECT
                copy_id,
                status,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM dbo.borrow_transactions AS bt
                        WHERE bt.copy_id = bc.copy_id
                          AND bt.status IN ('BORROWED', 'OVERDUE')
                    )
                    THEN 1
                    ELSE 0
                END AS has_active_loan
            FROM dbo.book_copies AS bc
            WHERE copy_id = @copyId;
        `);

    if (checkResult.recordset.length === 0) {
        return { type: "NOT_FOUND" };
    }

    return { type: "BORROWED" };
};


const deleteBook = async (dbPool, bookId) => {
    const transaction = new sql.Transaction(dbPool);

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        // 1. Kiểm tra đầu sách có tồn tại không.
        const bookResult = await transaction.request()
            .input("bookId", sql.Int, bookId)
            .query(`
                SELECT book_id
                FROM dbo.books WITH (UPDLOCK, HOLDLOCK)
                WHERE book_id = @bookId;
            `);

        if (bookResult.recordset.length === 0) {
            await transaction.rollback();
            return { type: "NOT_FOUND" };
        }

        // 2. Kiểm tra đầu sách đã có bản sao chưa.
        const copiesResult = await transaction.request()
            .input("bookId", sql.Int, bookId)
            .query(`
                SELECT TOP 1 copy_id
                FROM dbo.book_copies
                WHERE book_id = @bookId;
            `);

        if (copiesResult.recordset.length > 0) {
            await transaction.rollback();
            return { type: "HAS_COPIES" };
        }

        // 3. Kiểm tra lịch sử giao dịch liên quan.
        const transactionsResult = await transaction.request()
            .input("bookId", sql.Int, bookId)
            .query(`
                SELECT TOP 1 bt.transaction_id
                FROM dbo.borrow_transactions AS bt
                INNER JOIN dbo.book_copies AS bc
                    ON bt.copy_id = bc.copy_id
                WHERE bc.book_id = @bookId;
            `);

        if (transactionsResult.recordset.length > 0) {
            await transaction.rollback();
            return { type: "HAS_TRANSACTIONS" };
        }

        // 4. Chỉ xóa khi không có bản sao hoặc lịch sử giao dịch.
        await transaction.request()
            .input("bookId", sql.Int, bookId)
            .query(`
                DELETE FROM dbo.books
                WHERE book_id = @bookId;
            `);

        await transaction.commit();
        return { type: "DELETED" };

    } catch (error) {
        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                // Transaction có thể đã được rollback hoặc kết thúc.
            }
        }

        throw error;
    }
};

module.exports = {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    getBookCopies,
    createBookCopy,
    updateBookCopy
};