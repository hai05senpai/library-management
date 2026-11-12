
USE LibraryDB;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /* ==========================================
       1. LIBRARIAN
       ========================================== */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.librarian
        WHERE email = 'librarian@lbms.com'
    )
    BEGIN
        INSERT INTO dbo.librarian
            (full_name, email, password_hash)
        VALUES
            (N'Nguyễn Văn Thủ', 'librarian@lbms.com', 'DEMO_HASH_REPLACE_WITH_BCRYPT');
    END;


    /* ==========================================
       2. ADMIN
       ========================================== */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.admin
        WHERE email = 'admin@lbms.com'
    )
    BEGIN
        INSERT INTO dbo.admin
            (full_name, email, password_hash)
        VALUES
            (N'Quản trị viên', 'admin@lbms.com', 'DEMO_HASH_REPLACE_WITH_BCRYPT');
    END;


    /* ==========================================
       3. BORROWERS
       ========================================== */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.borrower
        WHERE barcode = 'SV0001'
    )
    BEGIN
        INSERT INTO dbo.borrower
            (barcode, full_name, email, password_hash,
             role_name, max_borrow_limit, max_borrow_days)
        VALUES
            ('SV0001', N'Nguyễn Minh Anh', 'minhanh@lbms.com',
             'DEMO_HASH_REPLACE_WITH_BCRYPT',
             'STUDENT', 5, 14);
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.borrower
        WHERE barcode = 'GV0001'
    )
    BEGIN
        INSERT INTO dbo.borrower
            (barcode, full_name, email, password_hash,
             role_name, max_borrow_limit, max_borrow_days)
        VALUES
            ('GV0001', N'Trần Văn Bình', 'vanbinh@lbms.com',
             'DEMO_HASH_REPLACE_WITH_BCRYPT',
             'LECTURER', 10, 30);
    END;


    /* ==========================================
       4. BOOKS
       ========================================== */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.books WHERE isbn = '9780131103627'
    )
    BEGIN
        INSERT INTO dbo.books
            (isbn, title, author, category, publisher, published_year)
        VALUES
            ('9780131103627', N'The C Programming Language',
             N'Brian W. Kernighan', N'Programming',
             N'Prentice Hall', 1988);
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.books WHERE isbn = '9780132350884'
    )
    BEGIN
        INSERT INTO dbo.books
            (isbn, title, author, category, publisher, published_year)
        VALUES
            ('9780132350884', N'Clean Code',
             N'Robert C. Martin', N'Software Engineering',
             N'Prentice Hall', 2008);
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.books WHERE isbn = '9780134685991'
    )
    BEGIN
        INSERT INTO dbo.books
            (isbn, title, author, category, publisher, published_year)
        VALUES
            ('9780134685991', N'Effective Java',
             N'Joshua Bloch', N'Programming',
             N'Addison-Wesley', 2017);
    END;


    /* ==========================================
       5. BOOK COPIES
       ========================================== */
    DECLARE @BookC INT =
        (SELECT book_id FROM dbo.books WHERE isbn = '9780131103627');

    DECLARE @BookClean INT =
        (SELECT book_id FROM dbo.books WHERE isbn = '9780132350884');

    DECLARE @BookJava INT =
        (SELECT book_id FROM dbo.books WHERE isbn = '9780134685991');

    IF NOT EXISTS (SELECT 1 FROM dbo.book_copies WHERE copy_barcode = 'COPY0001')
        INSERT INTO dbo.book_copies (book_id, copy_barcode)
        VALUES (@BookC, 'COPY0001');

    IF NOT EXISTS (SELECT 1 FROM dbo.book_copies WHERE copy_barcode = 'COPY0002')
        INSERT INTO dbo.book_copies (book_id, copy_barcode)
        VALUES (@BookClean, 'COPY0002');

    IF NOT EXISTS (SELECT 1 FROM dbo.book_copies WHERE copy_barcode = 'COPY0003')
        INSERT INTO dbo.book_copies (book_id, copy_barcode)
        VALUES (@BookJava, 'COPY0003');

    IF NOT EXISTS (SELECT 1 FROM dbo.book_copies WHERE copy_barcode = 'COPY0004')
        INSERT INTO dbo.book_copies (book_id, copy_barcode)
        VALUES (@BookC, 'COPY0004');

    IF NOT EXISTS (SELECT 1 FROM dbo.book_copies WHERE copy_barcode = 'COPY0005')
        INSERT INTO dbo.book_copies (book_id, copy_barcode)
        VALUES (@BookClean, 'COPY0005');


    /* ==========================================
       6. BORROW TRANSACTIONS
       ========================================== */
    DECLARE @Student INT =
        (SELECT borrower_id FROM dbo.borrower WHERE barcode = 'SV0001');

    DECLARE @Lecturer INT =
        (SELECT borrower_id FROM dbo.borrower WHERE barcode = 'GV0001');

    DECLARE @Librarian INT =
        (SELECT librarian_id FROM dbo.librarian WHERE email = 'librarian@lbms.com');

    DECLARE @Copy1 INT =
        (SELECT copy_id FROM dbo.book_copies WHERE copy_barcode = 'COPY0001');

    DECLARE @Copy2 INT =
        (SELECT copy_id FROM dbo.book_copies WHERE copy_barcode = 'COPY0002');

    DECLARE @Copy3 INT =
        (SELECT copy_id FROM dbo.book_copies WHERE copy_barcode = 'COPY0003');

    /* Transaction 1: Student đang mượn */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.borrow_transactions
        WHERE copy_id = @Copy1 AND status = 'BORROWED'
    )
    BEGIN
        INSERT INTO dbo.borrow_transactions
            (borrower_id, copy_id, librarian_id,
             borrow_date, due_date, status)
        VALUES
            (@Student, @Copy1, @Librarian,
             DATEADD(DAY, -3, SYSDATETIME()),
             DATEADD(DAY, 11, SYSDATETIME()),
             'BORROWED');

        UPDATE dbo.book_copies
        SET status = 'BORROWED'
        WHERE copy_id = @Copy1;
    END;

    /* Transaction 2: Lecturer đã trả */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.borrow_transactions
        WHERE copy_id = @Copy2
    )
    BEGIN
        INSERT INTO dbo.borrow_transactions
            (borrower_id, copy_id, librarian_id,
             borrow_date, due_date, return_date, status)
        VALUES
            (@Lecturer, @Copy2, @Librarian,
             DATEADD(DAY, -20, SYSDATETIME()),
             DATEADD(DAY, 10, SYSDATETIME()),
             DATEADD(DAY, -5, SYSDATETIME()),
             'RETURNED');

        UPDATE dbo.book_copies
        SET status = 'AVAILABLE'
        WHERE copy_id = @Copy2;
    END;

    /* Transaction 3: Student đang quá hạn */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.borrow_transactions
        WHERE copy_id = @Copy3 AND status = 'OVERDUE'
    )
    BEGIN
        INSERT INTO dbo.borrow_transactions
            (borrower_id, copy_id, librarian_id,
             borrow_date, due_date, status)
        VALUES
            (@Student, @Copy3, @Librarian,
             DATEADD(DAY, -25, SYSDATETIME()),
             DATEADD(DAY, -5, SYSDATETIME()),
             'OVERDUE');

        UPDATE dbo.book_copies
        SET status = 'BORROWED'
        WHERE copy_id = @Copy3;
    END;


    /* ==========================================
       7. RENEWAL REQUESTS
       ========================================== */
    DECLARE @Transaction1 INT =
        (SELECT TOP 1 transaction_id
         FROM dbo.borrow_transactions
         WHERE copy_id = @Copy1 AND status = 'BORROWED'
         ORDER BY transaction_id);

    DECLARE @Transaction3 INT =
        (SELECT TOP 1 transaction_id
         FROM dbo.borrow_transactions
         WHERE copy_id = @Copy3 AND status = 'OVERDUE'
         ORDER BY transaction_id);

    IF @Transaction1 IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM dbo.renewal_requests
           WHERE transaction_id = @Transaction1
       )
    BEGIN
        INSERT INTO dbo.renewal_requests
            (transaction_id, status)
        VALUES
            (@Transaction1, 'PENDING');
    END;

    IF @Transaction3 IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM dbo.renewal_requests
           WHERE transaction_id = @Transaction3
       )
    BEGIN
        INSERT INTO dbo.renewal_requests
            (transaction_id, status, processed_by, processed_at)
        VALUES
            (@Transaction3, 'REJECTED', @Librarian, SYSDATETIME());
    END;


    /* ==========================================
       8. FINES
       ========================================== */
    IF @Transaction3 IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM dbo.fines
           WHERE transaction_id = @Transaction3
       )
    BEGIN
        INSERT INTO dbo.fines
            (transaction_id, reason, overdue_days,
             amount, payment_status)
        VALUES
            (@Transaction3, N'Overdue book', 5,
             25000, 'UNPAID');
    END;

    COMMIT TRANSACTION;

    PRINT N'Inserted demo data successfully!';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO