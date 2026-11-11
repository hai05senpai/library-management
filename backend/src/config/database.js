const sql = require("mssql");
require("dotenv").config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,

    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate:
            process.env.DB_TRUST_SERVER_CERTIFICATE === "true"
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

if (process.env.DB_INSTANCE) {
    config.options.instanceName = process.env.DB_INSTANCE;
} else {
    config.port = Number(process.env.DB_PORT || 1433);
}

const connectDB = async () => {
    try {
        const pool = await sql.connect(config);

        console.log("SQL Server connected successfully!");

        return pool;
    } catch (error) {
        console.error("Database connection failed:", error.message);
        throw error;
    }
};

module.exports = {
    sql,
    connectDB
};