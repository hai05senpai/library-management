const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB, sql } = require("./config/database");

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

let dbPool;

// API kiểm tra Backend
app.get("/api/health", (req, res) => {
    res.json({
        status: "UP",
        service: "LBMS Backend"
    });
});

// API kiểm tra Database
app.get("/api/health/db", async (req, res) => {
    try {
        const result = await dbPool.request().query(
            "SELECT DB_NAME() AS databaseName, GETDATE() AS serverTime"
        );

        res.json({
            status: "UP",
            database: result.recordset[0].databaseName,
            connected: true
        });
    } catch (error) {
        res.status(500).json({
            status: "DOWN",
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        dbPool = await connectDB();

        app.locals.dbPool = dbPool;

        app.listen(PORT, () => {
            console.log(`LBMS Backend running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Cannot start server:", error.message);
        process.exit(1);
    }
};

startServer();