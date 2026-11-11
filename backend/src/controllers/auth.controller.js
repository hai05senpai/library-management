const jwt = require("jsonwebtoken");
const { authenticateUser } = require("../services/auth.service");

const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Lấy kết nối database từ Express app
        const dbPool = req.app.locals.dbPool;

        // Xác thực tài khoản
        const account = await authenticateUser(
            { email, password, role },
            dbPool
        );

        // Kiểm tra cấu hình JWT
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Server configuration error."
            });
        }

        // Tạo JWT
        const token = jwt.sign(
            {
                accountId: account.accountId,
                role: account.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công.",
            data: {
                account,
                token
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Đã xảy ra lỗi máy chủ."
        });
    }
};

module.exports = {
    login
};