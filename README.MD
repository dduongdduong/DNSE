# DNSE - Đà Nẵng Student Encyclopedia

Web dành cho sinh viên Đà Nẵng: lịch học, bản đồ địa điểm, diễn đàn, chat AI.

- Giao diện: HTML / CSS / JS thuần (Tailwind đã build sẵn trong `css/app.css`)
- Backend: Node.js (Express) + **SQL Server**
- Chat AI: Google Gemini (không bắt buộc, không có key vẫn chạy)

---

## 0. Cần cài trước

| Công cụ | Ghi chú |
|---|---|
| [VS Code](https://code.visualstudio.com/) | Editor |
| [Node.js](https://nodejs.org/) bản **18 trở lên** (chọn LTS) | Kiểm tra: `node -v` |
| SQL Server (**Express** hoặc **Developer**) | Bản Express miễn phí là đủ |
| SSMS (SQL Server Management Studio) | Để chạy file `.sql`. Hoặc dùng extension **SQL Server (mssql)** ngay trong VS Code |

Extension VS Code nên cài (không bắt buộc): **SQL Server (mssql)**, **Live Server**.

---

## 1. Mở project trong VS Code

1. Giải nén file zip được gửi.
2. VS Code > **File > Open Folder...** > chọn thư mục `DNSE` (thư mục có `index.html` và `server/`).
3. Mở terminal trong VS Code: **Terminal > New Terminal** (hoặc `Ctrl + ~`).

---

## 2. Bật SQL Server cho phép kết nối

Làm một lần duy nhất:

1. Mở **SSMS**, kết nối vào server của bạn. Chuột phải server > **Properties > Security** > chọn **SQL Server and Windows Authentication mode** > OK.
2. Mở **SQL Server Configuration Manager** > **SQL Server Network Configuration** > **Protocols for ...** > bật **TCP/IP**.
3. Restart dịch vụ SQL Server (cùng cửa sổ Configuration Manager > SQL Server Services > chuột phải > Restart).
   Nếu dùng bản Express có tên instance `SQLEXPRESS`, bật thêm dịch vụ **SQL Server Browser**.

---

## 3. Nạp database (3 file SQL, chạy ĐÚNG thứ tự)

Trong SSMS: **File > Open > File...** rồi bấm **Execute (F5)** lần lượt:

| Thứ tự | File | Làm gì |
|---|---|---|
| 1 | `database/schema.sql` | Tạo database `DNSE` và các bảng |
| 2 | `database/seed.sql` | Nạp dữ liệu ban đầu (trường, ngành, lịch, địa điểm, bài viết mẫu...) |
| 3 | `database/upgrade_v2.sql` | Thêm cột/bảng cho lịch cá nhân, địa điểm do sinh viên thêm, bổ sung dữ liệu |

> **Bắt buộc chạy cả file số 3.** Thiếu file này server sẽ báo lỗi cột `DayOfWeek`, `UserId`...
> Cả 3 file đều chạy lại được nhiều lần, không bị trùng dữ liệu.

### Tạo tài khoản đăng nhập cho app

File `.env.example` mặc định dùng user `DNSE`. Chạy đoạn này trong SSMS (đổi mật khẩu cho bạn):

```sql
CREATE LOGIN DNSE WITH PASSWORD = 'MatKhauCuaBan@123', CHECK_POLICY = OFF;
GO
USE DNSE;
GO
CREATE USER DNSE FOR LOGIN DNSE;
ALTER ROLE db_owner ADD MEMBER DNSE;
GO
```

Hoặc dùng luôn tài khoản `sa` (nhớ đã bật và đặt mật khẩu cho `sa`).

---

## 4. Cấu hình và chạy server

Trong terminal VS Code:

```bash
cd server
npm install
```

Tạo file `.env` từ file mẫu:

```bash
# Windows (cmd / PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Mở `server/.env` và sửa:

```env
PORT=3000
DB_SERVER=localhost
DB_INSTANCE=            # nếu dùng SQL Express thì điền: SQLEXPRESS
DB_PORT=1433
DB_NAME=DNSE
DB_USER=DNSE            # hoặc sa
DB_PASSWORD=mat_khau_ban_vua_dat
DB_ENCRYPT=false
DB_TRUST_CERT=true

# Không bắt buộc. Lấy key miễn phí tại https://aistudio.google.com/apikey
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

> Nếu điền `DB_INSTANCE=SQLEXPRESS` thì để trống `DB_PORT` hoặc giữ nguyên đều được, miễn đã bật SQL Server Browser ở bước 2.

Chạy server:

```bash
npm start
```

Terminal hiện 2 dòng này là thành công:

```
DNSE chạy tại http://localhost:3000
Đã kết nối SQL Server.
```

Mở trình duyệt: **http://localhost:3000**

Kiểm tra nhanh kết nối DB: http://localhost:3000/api/health

> Dòng cảnh báo `Chưa có GEMINI_API_KEY` là bình thường nếu bạn chưa điền key. Chat AI sẽ dùng nội dung có sẵn.

**Mẹo:** khi đang sửa code, chạy `npm run dev` thay cho `npm start` để server tự restart khi lưu file.

---

## 5. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Chưa kết nối được SQL Server: ECONNREFUSED` | Chưa bật TCP/IP hoặc chưa restart dịch vụ SQL Server (bước 2) |
| `Login failed for user 'DNSE'` | Sai mật khẩu trong `.env`, hoặc chưa bật chế độ Mixed Mode / chưa tạo login (bước 2, 3) |
| `Cannot open database "DNSE"` | Chưa chạy `schema.sql` |
| `Invalid column name 'DayOfWeek'` | Chưa chạy `upgrade_v2.sql` |
| Trang trắng, không có dữ liệu | Server chưa chạy hoặc chưa chạy `seed.sql`. Mở `/api/health` để kiểm tra |
| `npm` không nhận lệnh | Chưa cài Node.js, hoặc cần mở lại VS Code sau khi cài |
| Port 3000 đang bị chiếm | Đổi `PORT=3001` trong `.env` rồi mở `http://localhost:3001` |

---

## 6. Cấu trúc thư mục

```
DNSE/
├─ index.html, onboarding.html   Giao diện
├─ css/                          Style (app.css là Tailwind đã build)
├─ js/                           Code giao diện (modules/ và ui/)
├─ server/                       Backend Express
│   ├─ server.js                 Khởi động server, phục vụ giao diện
│   ├─ routes.js                 Các API
│   ├─ db.js                     Kết nối SQL Server
│   ├─ ai.js                     Gọi Gemini
│   └─ .env                      Cấu hình riêng của bạn (KHÔNG chia sẻ)
└─ database/
    ├─ schema.sql                1. Tạo bảng
    ├─ seed.sql                  2. Dữ liệu ban đầu
    └─ upgrade_v2.sql            3. Nâng cấp v2
```

---

## 7. Dành cho người gửi project: cách gửi seed SQL

### Cách A (khuyên dùng): gửi nguyên project

File `seed.sql` đã nằm sẵn trong thư mục `database/`, chỉ cần nén project và gửi.

**Trước khi nén, BẮT BUỘC:**

1. **Xóa `server/.env`** (chứa mật khẩu database của bạn). Chỉ giữ `server/.env.example`.
2. **Xóa thư mục `server/node_modules`** (rất nặng, bạn mình tự chạy `npm install`).
3. Nhớ giữ đủ 3 file trong `database/`: `schema.sql`, `seed.sql`, `upgrade_v2.sql`.

Rồi nén thư mục `DNSE` thành `.zip` và gửi qua Zalo / Drive / Messenger.

### Cách B: gửi dữ liệu hiện tại trong database của bạn

Dùng khi bạn đã thêm dữ liệu (bài viết, địa điểm, lịch...) và muốn bạn mình có đúng bản đó:

1. Mở **SSMS**, chuột phải database **DNSE > Tasks > Generate Scripts...**
2. Chọn **Select specific database objects** > tick tất cả **Tables** > Next.
3. Chọn **Save as script file**, đặt tên `database/seed_export.sql` > bấm **Advanced**.
4. Trong Advanced, chỉnh:
   - **Types of data to script** = **Data only**
   - **Script USE DATABASE** = **True**
5. Next > Finish. Gửi file `seed_export.sql` kèm project.

Bạn mình chạy theo thứ tự: `schema.sql` > `upgrade_v2.sql` > `seed_export.sql` (**không** chạy `seed.sql` nữa, tránh trùng dữ liệu).

> Nếu file export báo lỗi `IDENTITY_INSERT`, thêm `SET IDENTITY_INSERT dbo.TenBang ON;` trước và `OFF;` sau đoạn `INSERT` của bảng đó (SSMS thường tự thêm sẵn).

---

## Lưu ý

- Không đưa `server/.env` lên GitHub hay gửi cho người khác (đã có trong `.gitignore`). Nếu có `GEMINI_API_KEY`, key này cũng nằm trong file đó.
- Hồ sơ người dùng nằm trong bảng `Users`; `localStorage` chỉ giữ bản sao để nhớ phiên đăng nhập.
- Chỉ cần chạy `npm install` ở thư mục gốc và `npm run build:css` khi bạn sửa class Tailwind. Chạy app bình thường thì không cần.
#   D N S E
 
 
