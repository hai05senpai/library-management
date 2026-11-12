
USE LibraryDB;
GO

/* =====================================================
   1. BORROWER - Người mượn sách
   ===================================================== */
CREATE TABLE dbo.borrower (
    borrower_id INT IDENTITY(1,1) PRIMARY KEY,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    role_name VARCHAR(20) NOT NULL,
    max_borrow_limit INT NOT NULL,
    max_borrow_days INT NOT NULL,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_borrower_status DEFAULT 'ACTIVE',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_borrower_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT CK_borrower_role
        CHECK (role_name IN ('STUDENT', 'LECTURER')),

    CONSTRAINT CK_borrower_limit
        CHECK (max_borrow_limit > 0),

    CONSTRAINT CK_borrower_days
        CHECK (max_borrow_days > 0),

    CONSTRAINT CK_borrower_status
        CHECK (status IN ('ACTIVE', 'LOCKED'))
);
GO


/* =====================================================
   2. LIBRARIAN - Thủ thư
   ===================================================== */
CREATE TABLE dbo.librarian (
    librarian_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_librarian_status DEFAULT 'ACTIVE',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_librarian_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT CK_librarian_status
        CHECK (status IN ('ACTIVE', 'LOCKED'))
);
GO


/* =====================================================
   3. ADMIN - Quản trị viên
   ===================================================== */
CREATE TABLE dbo.admin (
    admin_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_admin_status DEFAULT 'ACTIVE',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_admin_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT CK_admin_status
        CHECK (status IN ('ACTIVE', 'LOCKED'))
);
GO


/* =====================================================
   4. BOOKS - Danh mục sách
   ===================================================== */
CREATE TABLE dbo.books (
    book_id INT IDENTITY(1,1) PRIMARY KEY,
    isbn VARCHAR(20) NULL,
    title NVARCHAR(255) NOT NULL,
    author NVARCHAR(255) NOT NULL,
    category NVARCHAR(100) NULL,
    publisher NVARCHAR(150) NULL,
    published_year INT NULL,
    description NVARCHAR(MAX) NULL,

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_books_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT CK_books_published_year
        CHECK (published_year IS NULL OR
               published_year BETWEEN 1000 AND 9999)
);
GO


/* =====================================================
   5. BOOK_COPIES - Các bản sao sách vật lý
   ===================================================== */
CREATE TABLE dbo.book_copies (
    copy_id INT IDENTITY(1,1) PRIMARY KEY,
    book_id INT NOT NULL,
    copy_barcode VARCHAR(50) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_book_copies_status DEFAULT 'AVAILABLE',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_book_copies_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT FK_book_copies_books
        FOREIGN KEY (book_id)
        REFERENCES dbo.books(book_id),

    CONSTRAINT CK_book_copies_status
        CHECK (status IN ('AVAILABLE', 'BORROWED', 'LOST', 'DAMAGED'))
);
GO


/* =====================================================
   6. BORROW_TRANSACTIONS - Giao dịch mượn trả
   ===================================================== */
CREATE TABLE dbo.borrow_transactions (
    transaction_id INT IDENTITY(1,1) PRIMARY KEY,

    borrower_id INT NOT NULL,
    copy_id INT NOT NULL,
    librarian_id INT NOT NULL,

    borrow_date DATETIME2 NOT NULL
        CONSTRAINT DF_borrow_transactions_borrow_date
        DEFAULT SYSDATETIME(),

    due_date DATETIME2 NOT NULL,
    return_date DATETIME2 NULL,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_borrow_transactions_status DEFAULT 'BORROWED',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_borrow_transactions_created_at
        DEFAULT SYSDATETIME(),

    CONSTRAINT FK_borrow_transactions_borrower
        FOREIGN KEY (borrower_id)
        REFERENCES dbo.borrower(borrower_id),

    CONSTRAINT FK_borrow_transactions_book_copies
        FOREIGN KEY (copy_id)
        REFERENCES dbo.book_copies(copy_id),

    CONSTRAINT FK_borrow_transactions_librarian
        FOREIGN KEY (librarian_id)
        REFERENCES dbo.librarian(librarian_id),

    CONSTRAINT CK_borrow_transactions_status
        CHECK (status IN ('BORROWED', 'RETURNED', 'OVERDUE')),

    CONSTRAINT CK_borrow_transactions_dates
        CHECK (
            due_date >= borrow_date
            AND (
                return_date IS NULL
                OR return_date >= borrow_date
            )
        )
);
GO


/* =====================================================
   7. RENEWAL_REQUESTS - Yêu cầu gia hạn
   ===================================================== */
CREATE TABLE dbo.renewal_requests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,

    transaction_id INT NOT NULL,
    request_date DATETIME2 NOT NULL
        CONSTRAINT DF_renewal_requests_request_date
        DEFAULT SYSDATETIME(),

    requested_due_date DATETIME2 NULL,

    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_renewal_requests_status DEFAULT 'PENDING',

    processed_by INT NULL,
    processed_at DATETIME2 NULL,

    CONSTRAINT FK_renewal_requests_transactions
        FOREIGN KEY (transaction_id)
        REFERENCES dbo.borrow_transactions(transaction_id),

    CONSTRAINT FK_renewal_requests_librarian
        FOREIGN KEY (processed_by)
        REFERENCES dbo.librarian(librarian_id),

    CONSTRAINT CK_renewal_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    CONSTRAINT CK_renewal_requests_processing
        CHECK (
            (status = 'PENDING'
                AND processed_by IS NULL
                AND processed_at IS NULL)
            OR
            (status IN ('APPROVED', 'REJECTED')
                AND processed_by IS NOT NULL
                AND processed_at IS NOT NULL)
        )
);
GO


/* =====================================================
   8. FINES - Các khoản phạt
   ===================================================== */
CREATE TABLE dbo.fines (
    fine_id INT IDENTITY(1,1) PRIMARY KEY,

    transaction_id INT NOT NULL,
    reason NVARCHAR(255) NOT NULL,
    overdue_days INT NULL,
    amount DECIMAL(12,2) NOT NULL,

    payment_status VARCHAR(20) NOT NULL
        CONSTRAINT DF_fines_payment_status DEFAULT 'UNPAID',

    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_fines_created_at DEFAULT SYSDATETIME(),

    paid_at DATETIME2 NULL,
    processed_by INT NULL,

    CONSTRAINT FK_fines_transactions
        FOREIGN KEY (transaction_id)
        REFERENCES dbo.borrow_transactions(transaction_id),

    CONSTRAINT FK_fines_librarian
        FOREIGN KEY (processed_by)
        REFERENCES dbo.librarian(librarian_id),

    CONSTRAINT CK_fines_amount
        CHECK (amount >= 0),

    CONSTRAINT CK_fines_overdue_days
        CHECK (overdue_days IS NULL OR overdue_days >= 0),

    CONSTRAINT CK_fines_payment_status
        CHECK (payment_status IN ('UNPAID', 'PAID')),

    CONSTRAINT CK_fines_payment_info
        CHECK (
            (payment_status = 'UNPAID' AND paid_at IS NULL)
            OR
            (payment_status = 'PAID'
                AND paid_at IS NOT NULL
                AND processed_by IS NOT NULL)
        )
);
GO


/* =====================================================
   9. INDEXES - Tối ưu truy vấn
   ===================================================== */

CREATE INDEX IX_book_copies_book_id
ON dbo.book_copies(book_id);

CREATE INDEX IX_borrow_transactions_borrower_id
ON dbo.borrow_transactions(borrower_id);

CREATE INDEX IX_borrow_transactions_copy_id
ON dbo.borrow_transactions(copy_id);

CREATE INDEX IX_borrow_transactions_librarian_id
ON dbo.borrow_transactions(librarian_id);

CREATE INDEX IX_borrow_transactions_status_due_date
ON dbo.borrow_transactions(status, due_date);

CREATE INDEX IX_renewal_requests_transaction_id
ON dbo.renewal_requests(transaction_id);

CREATE INDEX IX_renewal_requests_processed_by
ON dbo.renewal_requests(processed_by);

CREATE INDEX IX_fines_transaction_id
ON dbo.fines(transaction_id);

CREATE INDEX IX_fines_payment_status
ON dbo.fines(payment_status);

CREATE INDEX IX_fines_processed_by
ON dbo.fines(processed_by);
GO


/* =====================================================
   10. PREVENT MULTIPLE ACTIVE LOANS FOR ONE COPY
   ===================================================== */

CREATE UNIQUE INDEX UX_borrow_transactions_active_copy
ON dbo.borrow_transactions(copy_id)
WHERE status IN ('BORROWED', 'OVERDUE');
GO


PRINT N'LibraryDB: Created all 8 tables and indexes successfully!';
GO