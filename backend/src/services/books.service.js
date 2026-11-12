
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

module.exports = {
    getBooks,
    getBookById,
    createBook,
    updateBook
};