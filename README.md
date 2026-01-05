### 1) Mô tả Project

🛠️ Facility Feedback & Helpdesk Request System – Frontend (FE)

Frontend cho hệ thống quản lý phản ánh CSVC/Helpdesk theo mô hình **🎫 Ticket + ⏱️ SLA**. Ứng dụng được xây dựng bằng **⚛️ React + 🟦 TypeScript (⚡ Vite)**, UI với **🎨 TailwindCSS** và component theo phong cách **🧩 shadcn/ui + Radix**. FE kết nối với Backend (🟣 ASP.NET Core API) để đăng nhập, quản lý ticket, nhắn tin, thông báo, lịch/ca và báo cáo theo vai trò.

---

✨ Tính năng chính

👥 Theo vai trò
- **🎓 Student**
  - 📝 Tạo ticket phản ánh/yêu cầu hỗ trợ (CSVC, WiFi, thiết bị…)
  - 📋 Xem danh sách ticket, 🔎 lọc theo trạng thái
  - 🔍 Xem chi tiết ticket, 🧾 lịch sử trạng thái, 💬 bình luận/trao đổi
  - 🔔 Nhận thông báo khi ticket đổi trạng thái / được phân công

- 🧑‍🔧 Staff**
  - ✅ Xem ticket được giao, 🔄 cập nhật trạng thái xử lý
  - 💬 Trao đổi qua comment/message
  - 📅 Xem lịch/ca và 📊 thống kê liên quan công việc

- **🧑‍💼 Department Admin**
  - 📊 Dashboard tổng quan
  - 🗂️ Quản trị dữ liệu nền: 👤 Users / 🏢 Departments / 🏷️ Categories / 🏫 Rooms
  - ⏱️ Thiết lập SLA theo Category (thời gian phản hồi / hoàn tất)
  - 👇 Phân công xử lý ticket, 🧩 xem ticket trùng (duplicates)
  - 📈 Báo cáo SLA, thống kê ticket

🧠 Tổng quan chức năng
- 🔐 Login + lưu session (localStorage)
- 🧭 Dashboard theo role + điều hướng theo quyền
- 🎫 Ticket lifecycle: tạo → assign → xử lý → ✅ resolved/🔒 closed
- ⏱️ SLA tracking + 📈 báo cáo
- 💬 Messages & 🔔 Notifications
- 🗓️ Quản lý lịch/ca (shifts/schedule)

---

🧰 Công nghệ sử dụng

- ⚛️ **React + 🟦 TypeScript**
- ⚡ **Vite**
- 🎨 **TailwindCSS**
- 🧩 **shadcn/ui + Radix UI**
- 🧭 **react-router-dom**
- 🌐 Gọi API qua `fetch` (base URL cấu hình bằng biến môi trường)

---

✅ Yêu cầu môi trường

- 🟩 **Node.js >= 18** (khuyến nghị 18/20)
- 📦 npm (hoặc yarn/pnpm tuỳ bạn)

> 🔧 FE mặc định gọi API theo `VITE_API_BASE_URL` (fallback `https://localhost:7010/api`).

---

🚀 Cài đặt & chạy dự án

### 1) 📥 Cài dependencies
```bash
npm install
````

### 2) ⚙️ Tạo file môi trường `.env`

Tạo file `.env` ở root FE:

```env
VITE_API_BASE_URL=https://localhost:7010/api
```

> 🔁 Nếu BE chạy port khác, đổi lại cho đúng.

### 3) ▶️ Chạy dev

```bash
npm run dev
```

Sau đó mở URL do Vite in ra (thường là `http://localhost:5173`).

---

## 🏗️ Scripts thường dùng

> 📝 Tên script có thể khác tuỳ `package.json` của bạn, nhưng Vite thường có:

```bash
npm run dev        # ▶️ chạy local
npm run build      # 🏗️ build production
npm run preview    # 👀 preview sau build
npm run lint       # 🧹 (nếu có) lint
```

---

## 🧭 Điều hướng theo role

FE sử dụng routing và guard để đảm bảo user chỉ truy cập đúng vai trò:

* 🌍 Public: `/`, `/login`
* 🎓 Student: `/student/*`
* 🧑‍🔧 Staff: `/staff/*`
* 🧑‍💼 Admin: `/admin/*` (có guard kiểm tra role)

Session user thường được lưu trong `localStorage` (ví dụ key như `helpdesk_user`).

---

## 🔌 Kết nối Backend

FE gọi API theo base URL:

* ⚙️ `VITE_API_BASE_URL` (đọc từ `.env`)
* 🔁 Fallback: `https://localhost:7010/api`

### 🔒 Lưu ý CORS/HTTPS

* 🔐 Nếu BE bật HTTPS self-signed, trình duyệt có thể cảnh báo → bạn cần “Proceed/Accept”.
* 🚧 Nếu bị CORS, hãy cấu hình CORS ở BE cho origin của FE (ví dụ `http://localhost:5173`).

---
