# Library Borrowing Management System (LBMS)

Hệ thống quản lý mượn và trả sách thư viện được xây dựng trong khuôn khổ đồ án môn học **CO3011 – Software Project Management**.

README này hướng dẫn các thành viên thiết lập môi trường, cấu hình database, backend và frontend để chạy dự án trên máy cá nhân.

---

## 1. Công nghệ sử dụng

| Thành phần      | Công nghệ              |
| ----------------- | ------------------------ |
| Frontend          | React , TypeScript, Vite |
| Backend           | Node.js, Express         |
| Database          | Microsoft SQL Server     |
| API communication | Axios, REST API          |
| Authentication    | JWT                      |
| Frontend routing  | React Router             |
| UI icons          | Lucide React             |

## 2. Cấu trúc dự án

Cấu trúc thư mục chính:

```text
LBMS/
├── database/
│   ├── Create.sql
│   ├── Insert.sql
│   └── Insert-2.sql
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── ...
│
├── frontend/
│   ├── package.json
│   ├── .env.example
│   └── ...
│
└── README.md
```

## 3. Yêu cầu môi trường

Trước khi chạy dự án, cần cài đặt:

- Node.js phiên bản 18 trở lên.
- npm (được cài kèm Node.js).
- Microsoft SQL Server Express hoặc Developer.
- SQL Server Management Studio (SSMS).
- Git.

Kiểm tra Node.js và npm:

```bash
node -v
npm -v
```

Nếu chưa cài Node.js, tải tại: https://nodejs.org/

---

## 4. Thiết lập Database (Microsoft SQL Server)

Phần này hướng dẫn thành viên cài đặt SQL Server, cấu hình chế độ xác thực, tạo database `LibraryDB`, tạo tài khoản kết nối cho ứng dụng LBMS và khởi tạo dữ liệu mẫu.

**Cấu hình kết nối thống nhất của dự án:**

| Thuộc tính    | Giá trị                             |
| --------------- | ------------------------------------- |
| Database Server | `localhost`                         |
| Port            | `1433`                              |
| Database        | `LibraryDB`                         |
| Authentication  | SQL Server Authentication             |
| Login           | `lbms_app`                          |
| Password        | Do từng thành viên tự thiết lập |

Mỗi thành viên cần thực hiện các bước sau trên máy cá nhân.

### 4.1. Cài đặt SQL Server và SQL Server Management Studio

Cần cài đặt hai phần mềm:

**1. Microsoft SQL Server**

Có thể sử dụng một trong hai phiên bản:

- SQL Server Express: phiên bản miễn phí, phù hợp cho dự án.
- SQL Server Developer: miễn phí cho mục đích phát triển và kiểm thử.

Trang tải: https://www.microsoft.com/en-us/sql-server/sql-server-downloads

Trong quá trình cài đặt, có thể chọn:

- Database Engine Services.
- Instance mặc định hoặc instance có tên, tùy cách cài đặt.

**2. SQL Server Management Studio (SSMS)**

SSMS là công cụ giao diện để kết nối SQL Server, tạo database và thực thi các file `.sql`.

Trang tải: https://learn.microsoft.com/en-us/ssms/install/install

Sau khi cài đặt, mở SSMS và kiểm tra SQL Server đã hoạt động hay chưa.

### 4.2. Kiểm tra SQL Server đang sử dụng Windows Authentication hay SQL Server Authentication

SQL Server hỗ trợ hai chế độ xác thực phổ biến:

| Chế độ                 | Ý nghĩa                                                              |
| ------------------------- | ---------------------------------------------------------------------- |
| Windows Authentication    | Sử dụng tài khoản Windows hiện tại để đăng nhập SQL Server. |
| SQL Server Authentication | Sử dụng tài khoản SQL Server riêng, gồm username và password.   |

Nếu đang chọn Windows Authentication, SSMS đang sử dụng tài khoản Windows để kết nối.

Nếu chọn SQL Server Authentication, bạn cần nhập Login và Password của tài khoản SQL Server.

**Cách kiểm tra bằng câu lệnh SQL:**

### 4.3. Kết nối SQL Server bằng SQL Server Authentication

Sau khi bật Mixed Mode và cấu hình TCP/IP, quay lại SSMS.

Tại cửa sổ Connect to Server, nhập:

| Trường       | Giá trị                                                  |
| -------------- | ---------------------------------------------------------- |
| Server name    | localhost\SQLEXPRESS                                       |
| Authentication | SQL Server Authentication                                  |
| Username       | lbms_app                                                   |
| Password       | `ChangeThisPassword_123!` (nó là mật khẩu luôn :v) |

Nếu đăng nhập thành công, SQL Server đã sẵn sàng cho các bước tiếp theo.

### 4.4. Tạo database LibraryDB

Sau khi đã đăng nhập SQL Server thành công, mở New Query và thực thi:

```sql
USE master;
GO

CREATE DATABASE LibraryDB;
GO
```

Kiểm tra database đã được tạo:

```sql
SELECT name
FROM sys.databases
WHERE name = 'LibraryDB';
```

Nếu kết quả trả về `LibraryDB`, database đã được tạo thành công.

### 4.5. Tạo cấu trúc bảng bằng Create.sql

Trong repository của LBMS, mở file:

```text
database/Create.sql
```

Thực hiện:

1. Mở SSMS.
2. Kết nối SQL Server.
3. Chọn File → Open → File.
4. Chọn `database/Create.sql`.
5. Kiểm tra database đích là `LibraryDB`.
6. Nhấn Execute hoặc phím F5.

File `Create.sql` tạo các bảng:

| STT | Bảng                   | Chức năng                      |
| --- | ----------------------- | -------------------------------- |
| 1   | `borrower`            | Quản lý người mượn sách   |
| 2   | `librarian`           | Quản lý thủ thư              |
| 3   | `admin`               | Quản lý quản trị viên       |
| 4   | `books`               | Quản lý danh mục sách        |
| 5   | `book_copies`         | Quản lý bản sao sách         |
| 6   | `borrow_transactions` | Quản lý giao dịch mượn trả |
| 7   | `renewal_requests`    | Quản lý yêu cầu gia hạn     |
| 8   | `fines`               | Quản lý khoản phạt           |

Ngoài ra, script còn tạo:

- Primary Key.
- Foreign Key.
- Unique Constraint.
- Check Constraint.
- Default Constraint.
- Index.
- Unique Filtered Index.

**Kiểm tra kết quả:**

```sql
USE LibraryDB;
GO

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

Kết quả mong đợi là 8 bảng.

### 4.6. Thêm dữ liệu mẫu bằng Insert.sql

Mở file:

```text
database/Insert.sql
```

Thực thi toàn bộ nội dung bằng SSMS.

File này thêm dữ liệu mẫu gồm:

- Tài khoản thủ thư.
- Tài khoản quản trị viên.
- Độc giả sinh viên.
- Độc giả giảng viên.
- Đầu sách.
- Bản sao sách.
- Giao dịch đang mượn.
- Giao dịch đã trả.
- Giao dịch quá hạn.
- Yêu cầu gia hạn.
- Khoản phạt.

**Quan trọng – cấu hình mật khẩu demo:**

Trong file `Insert.sql`, các tài khoản mẫu đang có giá trị placeholder:

```text
DEMO_HASH_REPLACE_WITH_BCRYPT
```

Đây là BCrypt hash nhóm thống để đăng nhập nhé.

### 4.7. Bổ sung dữ liệu mẫu bằng Insert-2.sql

Sau khi chạy thành công `Insert.sql`, mở:

```text
database/Insert-2.sql
```

Thực thi script để bổ sung thêm:

- 10 độc giả.
- 10 đầu sách.
- Các bản sao sách bổ sung.
- Các giao dịch mượn, trả và quá hạn.
- Các yêu cầu gia hạn.
- Các khoản phạt.

### 4.8. Kiểm tra toàn bộ dữ liệu

Sau khi hoàn thành các bước trên, chạy:

```sql
USE LibraryDB;
GO

SELECT COUNT(*) AS TotalBorrowers
FROM dbo.borrower;

SELECT COUNT(*) AS TotalLibrarians
FROM dbo.librarian;

SELECT COUNT(*) AS TotalAdmins
FROM dbo.admin;

SELECT COUNT(*) AS TotalBooks
FROM dbo.books;

SELECT COUNT(*) AS TotalBookCopies
FROM dbo.book_copies;

SELECT COUNT(*) AS TotalTransactions
FROM dbo.borrow_transactions;

SELECT COUNT(*) AS TotalRenewalRequests
FROM dbo.renewal_requests;

SELECT COUNT(*) AS TotalFines
FROM dbo.fines;
```

Nếu các câu truy vấn chạy thành công, dữ liệu được hiển thị và không phát sinh lỗi ràng buộc, database đã sẵn sàng.

### 5. Cấu hình kết nối database cho Backend

Mở file:

```text
backend/.env
```

Cấu hình theo thông tin SQL Server trên máy cá nhân:

```env
PORT=5000

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=LibraryDB
DB_USER=lbms_app
DB_PASSWORD=ChangeThisPassword_123!
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=LBMS_ReplaceWithALongRandomSecretKey
JWT_EXPIRES_IN=1d
```

Giải thích các biến:

| Biến                           | Ý nghĩa                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| `PORT`                        | Port chạy backend                                                          |
| `DB_SERVER`                   | Địa chỉ SQL Server                                                       |
| `DB_PORT`                     | Port TCP/IP của SQL Server                                                 |
| `DB_NAME`                     | Tên database                                                               |
| `DB_USER`                     | SQL Server Login của ứng dụng                                            |
| `DB_PASSWORD`                 | Mật khẩu SQL Server Login                                                 |
| `DB_ENCRYPT`                  | Bật hoặc tắt mã hóa kết nối                                          |
| `DB_TRUST_SERVER_CERTIFICATE` | Cho phép tin cậy certificate của server trong môi trường phát triển |
| `JWT_SECRET`                  | Khóa bí mật ký JWT                                                      |
| `JWT_EXPIRES_IN`              | Thời hạn JWT                                                              |

Các biến này phải khớp với cấu hình thực tế trong `backend/config/database.js`.

### 5.1. Kiểm tra kết nối từ Backend

Sau khi cấu hình `.env`, khởi động backend:

```bash
cd backend
npm install
npm run dev
```

Nếu kết nối thành công, terminal sẽ hiển thị:

```text
SQL Server connected successfully!
```

Nếu kết nối thất bại, kiểm tra lần lượt:

1. SQL Server Service đã chạy chưa.
2. SQL Server đã bật Mixed Mode chưa.
3. TCP/IP đã được bật chưa.
4. SQL Server có đang lắng nghe trên port `1433` không.
5. Login `lbms_app` đã được tạo và bật chưa.
6. Password trong `.env` có chính xác không.
7. User `lbms_app` đã được tạo trong `LibraryDB` và được cấp quyền chưa.
8. `DB_SERVER`, `DB_PORT` và `DB_NAME` có đúng không.

**Hoàn thành phần này khi backend kết nối được SQL Server và có thể truy vấn dữ liệu trong `LibraryDB`.**

## 6. Thiết lập Frontend

### Bước 1. Mở thư mục frontend

Mở terminal mới, tại thư mục gốc của dự án:

```bash
cd frontend
```

### Bước 2. Cài đặt dependencies

```bash
npm install
```

### Bước 3. Cấu hình API

Frontend sử dụng Vite Proxy để chuyển tiếp các request `/api` đến backend.

Cấu hình proxy cần trỏ đến:

```text
http://localhost:5000
```

Ví dụ cấu hình trong `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

Nếu cấu hình proxy đã tồn tại trong dự án thì không cần thêm lại.

### Bước 4. Khởi động Frontend

```bash
npm run dev
```

Sau khi khởi động thành công, Vite sẽ hiển thị địa chỉ truy cập, thông thường là:

```text
http://localhost:5173
```

Mở địa chỉ này trên trình duyệt để sử dụng hệ thống.

---

## 7. Thứ tự khởi động toàn bộ hệ thống

Mỗi lần chạy dự án, thực hiện theo thứ tự:

| Thứ tự | Thành phần | Công việc                                     |
| -------- | ------------ | ----------------------------------------------- |
| 1        | SQL Server   | Đảm bảo SQL Server đang hoạt động        |
| 2        | Database     | Kiểm tra database `LibraryDB` đã tồn tại |
| 3        | Backend      | Chạy server Node.js                            |
| 4        | Frontend     | Chạy ứng dụng React bằng Vite               |
| 5        | Browser      | Truy cập frontend                              |

Mở hai terminal riêng biệt:

**Terminal 1 – Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend**

```bash
cd frontend
npm run dev
```

Sau đó truy cập địa chỉ frontend được Vite cung cấp.

---

## 8. Một số lỗi thường gặp

### 8.1. Không kết nối được SQL Server

Mn chạy nhập theo các thông số dữ liệu trong .env luôn nhé nếu gặp lỗi.

### 8.2. Lỗi `Cannot find module`

Chạy lại:

```bash
npm install
```

Trong đúng thư mục `backend/` hoặc `frontend/`.

### 8.3. Frontend không gọi được API

Kiểm tra:

- Backend đã chạy chưa.
- Backend có chạy đúng port `5000` không.
- Cấu hình Vite Proxy có đúng không.
- Request có sử dụng đúng tiền tố `/api` không.

### 8.4. Đăng nhập không thành công với tài khoản demo

Mn vô file demo.txt để đăng nhập test hệ thống nhé.

### 8.5. Lỗi khi chạy Insert.sql hoặc Insert-2.sql

Kiểm tra:

- Database `LibraryDB` đã được tạo chưa.
- Đã chạy `Create.sql` trước chưa.
- Đã chạy `Insert.sql` trước `Insert-2.sql` chưa.
- Các barcode và email có bị trùng không.
- Script `Insert-2.sql` đã được sửa phần tạo barcode bản sao chưa.

---

## 9. Quy định làm việc với Git

Để tránh ảnh hưởng đến code của thành viên khác:

- Không commit trực tiếp lên nhánh `main`.
- Mỗi thành viên làm việc trên branch riêng theo module được phân công.
- Pull code mới nhất trước khi bắt đầu làm việc.
- Commit với nội dung mô tả rõ ràng.
- Tạo Pull Request để PM review và tích hợp.
- Không tự ý thay đổi database schema khi chưa trao đổi và được PM thống nhất.

Ví dụ:

```bash
git checkout main
git pull origin main

git checkout -b feature/your-module
```

Sau khi hoàn thành:

```bash
git add .
git commit -m "feat: implement module functionality"
git push origin feature/your-module
```

Sau đó tạo Pull Request trên GitHub.

---
