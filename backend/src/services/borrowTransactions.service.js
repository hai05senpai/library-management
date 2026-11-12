
const { sql } = require("../config/database");

// GET /api/borrow-transactions
const getBorrowTransactions = async (
    dbPool,
    { search, status, page, limit, borrowerId }
) => {
    const offset = (page - 1) * limit;

    const buildRequest = () => {
        const request = dbPool.request();

        request.input(
            "search",
            sql.NVarChar(255),
            search || null
        );

        request.input(
            "status",
            sql.VarChar(20),
            status || null
        );

        request.input(
            "borrowerId",
            sql.Int,
            borrowerId ?? null
        );

        return request;
    };

    const whereClause = `
        WHERE
            (@status IS NULL OR bt.status = @status)
            AND
            (@borrowerId IS NULL OR bt.borrower_id = @borrowerId)
            AND
            (
                @search IS NULL
                OR b.barcode LIKE '%' + @search + '%'
                OR b.full_name LIKE N'%' + @search + N'%'
                OR bk.title LIKE N'%' + @search + N'%'
                OR bc.copy_barcode LIKE '%' + @search + '%'
            )
    `;

    // Count total matching transactions.
    const countResult = await buildRequest().query(`
        SELECT COUNT(*) AS total
        FROM dbo.borrow_transactions bt
        INNER JOIN dbo.borrower b
            ON bt.borrower_id = b.borrower_id
        INNER JOIN dbo.book_copies bc
            ON bt.copy_id = bc.copy_id
        INNER JOIN dbo.books bk
            ON bc.book_id = bk.book_id
        ${whereClause};
    `);

    const total = countResult.recordset[0].total;

    // Retrieve transactions for the requested page.
    const transactionsResult = await buildRequest()
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit)
        .query(`
            SELECT
                bt.transaction_id,
                bt.borrower_id,
                b.barcode,
                b.full_name AS borrower_name,
                b.role_name,

                bt.copy_id,
                bc.copy_barcode,

                bk.book_id,
                bk.title AS book_title,
                bk.author,

                bt.librarian_id,
                l.full_name AS librarian_name,

                bt.borrow_date,
                bt.due_date,
                bt.return_date,
                bt.status,
                bt.created_at
            FROM dbo.borrow_transactions bt
            INNER JOIN dbo.borrower b
                ON bt.borrower_id = b.borrower_id
            INNER JOIN dbo.book_copies bc
                ON bt.copy_id = bc.copy_id
            INNER JOIN dbo.books bk
                ON bc.book_id = bk.book_id
            INNER JOIN dbo.librarian l
                ON bt.librarian_id = l.librarian_id
            ${whereClause}
            ORDER BY bt.transaction_id DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `);

    return {
        transactions: transactionsResult.recordset,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// GET /api/borrow-transactions/:id
const getBorrowTransactionById = async (
    dbPool,
    transactionId,
    borrowerId
) => {
    const request = dbPool.request();

    request.input(
        "transactionId",
        sql.Int,
        transactionId
    );

    request.input(
        "borrowerId",
        sql.Int,
        borrowerId ?? null
    );

    const result = await request.query(`
        SELECT
            bt.transaction_id,
            bt.borrower_id,

            b.barcode,
            b.full_name AS borrower_name,
            b.email AS borrower_email,
            b.role_name,
            b.status AS borrower_status,

            bt.copy_id,
            bc.copy_barcode,
            bc.status AS copy_status,

            bk.book_id,
            bk.isbn,
            bk.title AS book_title,
            bk.author,
            bk.category,
            bk.publisher,

            bt.librarian_id,
            l.full_name AS librarian_name,

            bt.borrow_date,
            bt.due_date,
            bt.return_date,
            bt.status AS transaction_status,
            bt.created_at
        FROM dbo.borrow_transactions bt
        INNER JOIN dbo.borrower b
            ON bt.borrower_id = b.borrower_id
        INNER JOIN dbo.book_copies bc
            ON bt.copy_id = bc.copy_id
        INNER JOIN dbo.books bk
            ON bc.book_id = bk.book_id
        INNER JOIN dbo.librarian l
            ON bt.librarian_id = l.librarian_id
        WHERE
            bt.transaction_id = @transactionId
            AND (
                @borrowerId IS NULL
                OR bt.borrower_id = @borrowerId
            );
    `);

    return result.recordset[0] || null;
};



// POST /api/borrow-transactions
const createBorrowTransaction = async (
    dbPool,
    { borrowerBarcode, copyBarcode, librarianId }
) => {
    const transaction = new sql.Transaction(dbPool);

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        // 1. Tìm và khóa người mượn bằng barcode.
        const borrowerResult = await new sql.Request(transaction)
            .input("borrowerBarcode", sql.VarChar(50), borrowerBarcode)
            .query(`
                SELECT
                    borrower_id,
                    barcode,
                    status,
                    max_borrow_limit,
                    max_borrow_days
                FROM dbo.borrower WITH (UPDLOCK, HOLDLOCK)
                WHERE barcode = @borrowerBarcode;
            `);

        const borrower = borrowerResult.recordset[0];

        if (!borrower) {
            const error = new Error("Không tìm thấy người mượn với barcode này.");
            error.statusCode = 404;
            throw error;
        }

        if (borrower.status !== "ACTIVE") {
            const error = new Error("Tài khoản người mượn không hoạt động.");
            error.statusCode = 400;
            throw error;
        }

        // 2. Tìm và khóa bản sao sách bằng barcode.
        const copyResult = await new sql.Request(transaction)
            .input("copyBarcode", sql.VarChar(50), copyBarcode)
            .query(`
                SELECT
                    copy_id,
                    copy_barcode,
                    status
                FROM dbo.book_copies WITH (UPDLOCK, HOLDLOCK)
                WHERE copy_barcode = @copyBarcode;
            `);

        const copy = copyResult.recordset[0];

        if (!copy) {
            const error = new Error("Không tìm thấy bản sao sách với barcode này.");
            error.statusCode = 404;
            throw error;
        }

        if (copy.status !== "AVAILABLE") {
            const error = new Error("Bản sao sách hiện không khả dụng.");
            error.statusCode = 409;
            throw error;
        }

        // 3. Kiểm tra giới hạn số sách đang mượn.
        const activeLoansResult = await new sql.Request(transaction)
            .input("borrowerId", sql.Int, borrower.borrower_id)
            .query(`
                SELECT COUNT(*) AS activeLoanCount
                FROM dbo.borrow_transactions
                WHERE borrower_id = @borrowerId
                  AND status IN ('BORROWED', 'OVERDUE');
            `);

        const activeLoanCount =
            activeLoansResult.recordset[0].activeLoanCount;

        if (activeLoanCount >= borrower.max_borrow_limit) {
            const error = new Error(
                "Người mượn đã đạt giới hạn số lượng sách được mượn."
            );
            error.statusCode = 400;
            throw error;
        }

        // 4. Cập nhật trạng thái bản sao sách.
        const updateCopyResult = await new sql.Request(transaction)
            .input("copyId", sql.Int, copy.copy_id)
            .query(`
                UPDATE dbo.book_copies
                SET status = 'BORROWED'
                WHERE copy_id = @copyId
                  AND status = 'AVAILABLE';
            `);

        if (updateCopyResult.rowsAffected[0] !== 1) {
            const error = new Error(
                "Bản sao sách không còn khả dụng. Vui lòng thử lại."
            );
            error.statusCode = 409;
            throw error;
        }

        // 5. Tạo giao dịch mượn.
        const insertResult = await new sql.Request(transaction)
            .input("borrowerId", sql.Int, borrower.borrower_id)
            .input("copyId", sql.Int, copy.copy_id)
            .input("librarianId", sql.Int, librarianId)
            .input("maxBorrowDays", sql.Int, borrower.max_borrow_days)
            .query(`
                DECLARE @borrowDate DATETIME2 = SYSDATETIME();

                INSERT INTO dbo.borrow_transactions (
                    borrower_id,
                    copy_id,
                    librarian_id,
                    borrow_date,
                    due_date,
                    status
                )
                OUTPUT
                    INSERTED.transaction_id,
                    INSERTED.borrower_id,
                    INSERTED.copy_id,
                    INSERTED.librarian_id,
                    INSERTED.borrow_date,
                    INSERTED.due_date,
                    INSERTED.status,
                    INSERTED.created_at
                VALUES (
                    @borrowerId,
                    @copyId,
                    @librarianId,
                    @borrowDate,
                    DATEADD(DAY, @maxBorrowDays, @borrowDate),
                    'BORROWED'
                );
            `);

        const createdTransaction = insertResult.recordset[0];

        await transaction.commit();

        return createdTransaction;

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }

        throw error;
    }
};



module.exports = {
    getBorrowTransactions,
    getBorrowTransactionById,
    createBorrowTransaction
};