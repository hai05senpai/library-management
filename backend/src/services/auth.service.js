const bcrypt = require("bcryptjs");
const { sql } = require("../config/database");

// Xác định bảng và truy vấn tương ứng với từng role.
// Tên bảng và cột được cố định trong code, không lấy trực tiếp từ request.
const ROLE_QUERIES = {
    STUDENT: {
        query: `
            SELECT
                borrower_id AS account_id,
                full_name,
                email,
                password_hash,
                status,
                role_name AS role
            FROM dbo.borrower
            WHERE email = @email
              AND role_name = 'STUDENT'
        `
    },

    LECTURER: {
        query: `
            SELECT
                borrower_id AS account_id,
                full_name,
                email,
                password_hash,
                status,
                role_name AS role
            FROM dbo.borrower
            WHERE email = @email
              AND role_name = 'LECTURER'
        `
    },

    LIBRARIAN: {
        query: `
            SELECT
                librarian_id AS account_id,
                full_name,
                email,
                password_hash,
                status,
                'LIBRARIAN' AS role
            FROM dbo.librarian
            WHERE email = @email
        `
    },

    ADMIN: {
        query: `
            SELECT
                admin_id AS account_id,
                full_name,
                email,
                password_hash,
                status,
                'ADMIN' AS role
            FROM dbo.admin
            WHERE email = @email
        `
    }
};

/**
 * Xác thực tài khoản đăng nhập.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {string} credentials.role
 * @param {Object} dbPool SQL Server connection pool
 *
 * @returns {Object} Thông tin tài khoản đã xác thực
 */
const authenticateUser = async ({ email, password, role }, dbPool) => {
    // 1. Kiểm tra dữ liệu đầu vào
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof role !== "string" ||
        !email.trim() ||
        !password
    ) {
        const error = new Error("Vui lòng nhập đầy đủ thông tin đăng nhập.");
        error.statusCode = 400;
        throw error;
    }

    const normalizedEmail = email.trim();
    const normalizedRole = role.trim().toUpperCase();

    // 2. Kiểm tra role có hợp lệ không
    const roleConfig = ROLE_QUERIES[normalizedRole];

    if (!roleConfig) {
        const error = new Error("Vai trò đăng nhập không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    // 3. Truy vấn tài khoản theo role
    const result = await dbPool
        .request()
        .input("email", sql.VarChar(255), normalizedEmail)
        .query(roleConfig.query);

    const account = result.recordset[0];

    // 4. Kiểm tra tài khoản và mật khẩu
    if (!account) {
        const error = new Error("Email hoặc mật khẩu không chính xác.");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        account.password_hash
    );

    if (!isPasswordValid) {
        const error = new Error("Email hoặc mật khẩu không chính xác.");
        error.statusCode = 401;
        throw error;
    }

    // 5. Kiểm tra trạng thái tài khoản
    if (account.status !== "ACTIVE") {
        const error = new Error("Tài khoản của bạn hiện đang bị khóa.");
        error.statusCode = 403;
        throw error;
    }

    // 6. Chỉ trả về thông tin cần thiết, không trả password_hash
    return {
        accountId: account.account_id,
        fullName: account.full_name,
        email: account.email,
        role: account.role
    };
};

module.exports = {
    authenticateUser
};