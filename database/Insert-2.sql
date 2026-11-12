
USE LibraryDB;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    ------------------------------------------------------------
    -- 1. Lấy dữ liệu tham chiếu hiện có
    ------------------------------------------------------------
    DECLARE @LibrarianId INT;
    DECLARE @PasswordHash VARCHAR(255);

    SELECT TOP 1 @LibrarianId = librarian_id
    FROM dbo.librarian
    WHERE status = 'ACTIVE'
    ORDER BY librarian_id;

    SELECT TOP 1 @PasswordHash = password_hash
    FROM dbo.borrower
    WHERE password_hash IS NOT NULL
    ORDER BY borrower_id;

    IF @LibrarianId IS NULL
        THROW 50001, 'Khong tim thay librarian ACTIVE.', 1;

    IF @PasswordHash IS NULL
        THROW 50002, 'Khong tim thay password_hash mau.', 1;

    ------------------------------------------------------------
    -- 2. Thêm 10 độc giả
    ------------------------------------------------------------
    DECLARE @BorrowerSeed TABLE (
        barcode VARCHAR(50),
        full_name NVARCHAR(100),
        email VARCHAR(255),
        role_name VARCHAR(20),
        max_borrow_limit INT,
        max_borrow_days INT,
        status VARCHAR(20)
    );

    INSERT INTO @BorrowerSeed VALUES
    ('SV0002', N'Lê Hoàng Nam', 'nam.le@lbms.com', 'STUDENT', 5, 14, 'ACTIVE'),
    ('SV0003', N'Phạm Thùy Linh', 'linh.pham@lbms.com', 'STUDENT', 5, 14, 'ACTIVE'),
    ('SV0004', N'Nguyễn Quốc Huy', 'huy.nguyen@lbms.com', 'STUDENT', 5, 14, 'ACTIVE'),
    ('SV0005', N'Trần Ngọc Mai', 'mai.tran@lbms.com', 'STUDENT', 5, 14, 'ACTIVE'),
    ('SV0006', N'Võ Minh Khang', 'khang.vo@lbms.com', 'STUDENT', 5, 14, 'ACTIVE'),
    ('SV0007', N'Đặng Thu Hà', 'ha.dang@lbms.com', 'STUDENT', 5, 14, 'LOCKED'),
    ('GV0002', N'Lê Thanh Tùng', 'tung.le@lbms.com', 'LECTURER', 10, 30, 'ACTIVE'),
    ('GV0003', N'Phạm Minh Đức', 'duc.pham@lbms.com', 'LECTURER', 10, 30, 'ACTIVE'),
    ('GV0004', N'Nguyễn Thị Lan', 'lan.nguyen@lbms.com', 'LECTURER', 10, 30, 'ACTIVE'),
    ('GV0005', N'Trần Quốc Bảo', 'bao.tran@lbms.com', 'LECTURER', 10, 30, 'ACTIVE');

    INSERT INTO dbo.borrower (
        barcode, full_name, email, password_hash,
        role_name, max_borrow_limit, max_borrow_days, status
    )
    SELECT
        s.barcode, s.full_name, s.email, @PasswordHash,
        s.role_name, s.max_borrow_limit, s.max_borrow_days, s.status
    FROM @BorrowerSeed s
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.borrower b
        WHERE b.barcode = s.barcode OR b.email = s.email
    );

    ------------------------------------------------------------
    -- 3. Thêm 10 đầu sách
    ------------------------------------------------------------
    DECLARE @BookSeed TABLE (
        isbn VARCHAR(20),
        title NVARCHAR(255),
        author NVARCHAR(150),
        category NVARCHAR(100),
        publisher NVARCHAR(150),
        published_year INT
    );

    INSERT INTO @BookSeed VALUES
    ('9780132350885', N'Clean Architecture', N'Robert C. Martin', N'Software Engineering', N'Pearson', 2017),
    ('9780134757599', N'Refactoring', N'Martin Fowler', N'Software Engineering', N'Addison-Wesley', 2018),
    ('9780201633610', N'Design Patterns', N'Erich Gamma', N'Software Engineering', N'Addison-Wesley', 1994),
    ('9780134494166', N'Effective Modern C++', N'Scott Meyers', N'Programming', N'O''Reilly', 2014),
    ('9781491950296', N'Learning Python', N'Mark Lutz', N'Programming', N'O''Reilly', 2013),
    ('9780135957059', N'The Pragmatic Programmer', N'David Thomas', N'Software Engineering', N'Addison-Wesley', 2019),
    ('9781617294945', N'Grokking Algorithms', N'Aditya Bhargava', N'Algorithms', N'Manning', 2016),
    ('9780262046305', N'Introduction to Algorithms', N'Thomas H. Cormen', N'Algorithms', N'MIT Press', 2022),
    ('9780135166307', N'Database System Concepts', N'Abraham Silberschatz', N'Database', N'McGraw-Hill', 2019),
    ('9780321125217', N'Domain-Driven Design', N'Eric Evans', N'Software Engineering', N'Addison-Wesley', 2003);

    INSERT INTO dbo.books (
        isbn, title, author, category, publisher, published_year
    )
    SELECT
        s.isbn, s.title, s.author, s.category,
        s.publisher, s.published_year
    FROM @BookSeed s
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.books b WHERE b.isbn = s.isbn
    );

    ------------------------------------------------------------
    -- 4. Thêm 30 bản sao
    ------------------------------------------------------------
    DECLARE @CopySeed TABLE (
        copy_barcode VARCHAR(50),
        isbn VARCHAR(20),
        copy_number INT
    );

    INSERT INTO @CopySeed
    SELECT
        CONCAT('COPY', RIGHT(CONCAT('0000', n.number), 4)),
        b.isbn,
        n.copy_number
    FROM @BookSeed b
    CROSS JOIN (
        SELECT 1 AS copy_number, 1 AS number
        UNION ALL SELECT 2, 2
        UNION ALL SELECT 3, 3
    ) n;

    INSERT INTO dbo.book_copies (book_id, copy_barcode, status)
    SELECT
        b.book_id,
        s.copy_barcode,
        CASE
            WHEN s.copy_number = 1 THEN 'AVAILABLE'
            WHEN s.copy_number = 2 THEN 'LOST'
            ELSE 'DAMAGED'
        END
    FROM @CopySeed s
    JOIN dbo.books b ON b.isbn = s.isbn
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.book_copies bc
        WHERE bc.copy_barcode = s.copy_barcode
    );

    ------------------------------------------------------------
    -- 5. Tạo 30 giao dịch trên 30 bản sao mới
    --    10 RETURNED, 10 BORROWED, 10 OVERDUE
    ------------------------------------------------------------
    DECLARE @NewCopies TABLE (
        row_num INT IDENTITY(1,1),
        copy_id INT,
        copy_barcode VARCHAR(50)
    );

    INSERT INTO @NewCopies (copy_id, copy_barcode)
    SELECT TOP 30
        bc.copy_id, bc.copy_barcode
    FROM dbo.book_copies bc
    WHERE bc.copy_barcode LIKE 'COPY%'
      AND TRY_CONVERT(INT, RIGHT(bc.copy_barcode, 4)) BETWEEN 1 AND 30
      AND bc.status IN ('AVAILABLE', 'LOST', 'DAMAGED')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.borrow_transactions bt
          WHERE bt.copy_id = bc.copy_id
      )
    ORDER BY bc.copy_id;

    -- Chỉ sử dụng các bản sao AVAILABLE để tạo giao dịch.
    -- Mỗi giao dịch được tạo với trạng thái nhất quán.
    DECLARE @i INT = 1;
    DECLARE @CopyId INT;
    DECLARE @CopyBarcode VARCHAR(50);
    DECLARE @BorrowerId INT;
    DECLARE @BorrowerCount INT;
    DECLARE @BorrowerIndex INT;
    DECLARE @BorrowerIds TABLE (
        row_num INT IDENTITY(1,1),
        borrower_id INT
    );

    INSERT INTO @BorrowerIds (borrower_id)
    SELECT borrower_id
    FROM dbo.borrower
    WHERE status = 'ACTIVE'
    ORDER BY borrower_id;

    SELECT @BorrowerCount = COUNT(*) FROM @BorrowerIds;

    IF @BorrowerCount = 0
        THROW 50003, 'Khong co borrower ACTIVE de tao giao dich.', 1;

    -- Lấy các bản sao mới có thể cho mượn.
    DECLARE @AvailableCopies TABLE (
        row_num INT IDENTITY(1,1),
        copy_id INT
    );

    INSERT INTO @AvailableCopies (copy_id)
    SELECT TOP 30 bc.copy_id
    FROM dbo.book_copies bc
    WHERE bc.copy_barcode LIKE 'COPY%'
      AND TRY_CONVERT(INT, RIGHT(bc.copy_barcode, 4)) BETWEEN 1 AND 30
      AND bc.status = 'AVAILABLE'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.borrow_transactions bt
          WHERE bt.copy_id = bc.copy_id
      )
    ORDER BY bc.copy_id;

    DECLARE @AvailableCount INT;
    SELECT @AvailableCount = COUNT(*) FROM @AvailableCopies;

    SET @i = 1;

    WHILE @i <= @AvailableCount
    BEGIN
        SELECT @CopyId = copy_id
        FROM @AvailableCopies
        WHERE row_num = @i;

        SET @BorrowerIndex = ((@i - 1) % @BorrowerCount) + 1;

        SELECT @BorrowerId = borrower_id
        FROM @BorrowerIds
        WHERE row_num = @BorrowerIndex;

        -- Mỗi nhóm 3 giao dịch:
        -- 1 RETURNED, 1 BORROWED, 1 OVERDUE
        IF @i % 3 = 1
        BEGIN
            INSERT INTO dbo.borrow_transactions (
                borrower_id, copy_id, librarian_id,
                borrow_date, due_date, return_date, status
            )
            VALUES (
                @BorrowerId, @CopyId, @LibrarianId,
                DATEADD(DAY, -20, SYSDATETIME()),
                DATEADD(DAY, -6, SYSDATETIME()),
                DATEADD(DAY, -3, SYSDATETIME()),
                'RETURNED'
            );

            UPDATE dbo.book_copies
            SET status = 'AVAILABLE'
            WHERE copy_id = @CopyId;
        END
        ELSE IF @i % 3 = 2
        BEGIN
            INSERT INTO dbo.borrow_transactions (
                borrower_id, copy_id, librarian_id,
                borrow_date, due_date, return_date, status
            )
            VALUES (
                @BorrowerId, @CopyId, @LibrarianId,
                DATEADD(DAY, -3, SYSDATETIME()),
                DATEADD(DAY, 11, SYSDATETIME()),
                NULL,
                'BORROWED'
            );

            UPDATE dbo.book_copies
            SET status = 'BORROWED'
            WHERE copy_id = @CopyId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.borrow_transactions (
                borrower_id, copy_id, librarian_id,
                borrow_date, due_date, return_date, status
            )
            VALUES (
                @BorrowerId, @CopyId, @LibrarianId,
                DATEADD(DAY, -25, SYSDATETIME()),
                DATEADD(DAY, -5, SYSDATETIME()),
                NULL,
                'OVERDUE'
            );

            UPDATE dbo.book_copies
            SET status = 'BORROWED'
            WHERE copy_id = @CopyId;
        END;

        SET @i += 1;
    END;

    ------------------------------------------------------------
    -- 6. Thêm yêu cầu gia hạn cho các giao dịch phù hợp
    ------------------------------------------------------------
    INSERT INTO dbo.renewal_requests (
        transaction_id, request_date, requested_due_date,
        status, processed_by, processed_at
    )
    SELECT
        bt.transaction_id,
        DATEADD(DAY, -1, bt.due_date),
        DATEADD(DAY, 14, bt.due_date),
        'PENDING',
        NULL,
        NULL
    FROM dbo.borrow_transactions bt
    WHERE bt.status = 'BORROWED'
      AND bt.transaction_id > 3
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.renewal_requests rr
          WHERE rr.transaction_id = bt.transaction_id
      );

    ------------------------------------------------------------
    -- 7. Thêm một số khoản phạt cho giao dịch đã quá hạn
    ------------------------------------------------------------
    INSERT INTO dbo.fines (
        transaction_id, reason, overdue_days, amount,
        payment_status, paid_at, processed_by
    )
    SELECT
        bt.transaction_id,
        N'Overdue book',
        5,
        25000,
        'UNPAID',
        NULL,
        NULL
    FROM dbo.borrow_transactions bt
    WHERE bt.status = 'OVERDUE'
      AND bt.transaction_id > 3
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.fines f
          WHERE f.transaction_id = bt.transaction_id
      );

    COMMIT TRANSACTION;

    PRINT N'Bo sung du lieu thanh cong.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO