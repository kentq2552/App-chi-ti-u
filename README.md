# Sổ Chi Tiêu

App ghi chi tiêu cá nhân chạy trên iPhone (web app cài lên màn hình chính).

- Mỗi người dùng trên máy của mình có sổ riêng; dữ liệu nằm trên điện thoại, không gửi đi đâu.
- Nhiều người dùng chung một máy: mỗi người một tài khoản, có thể khóa bằng mã PIN 4 số.
- Tự xếp danh mục: cùng một nơi xếp vào cùng danh mục hai lần thì lần sau tự chọn.
- Hạn mức tháng, dự kiến chi cuối tháng, khoản cố định, ẩn số tiền.
- Nhiều loại tiền: mỗi sổ có một tiền tệ chính (VND, USD, EUR, JPY, KRW…); khi ghi chọn được
  loại tiền khác, tỷ giá tự lấy từ open.er-api.com (lưu 12 giờ, sửa tay được). Đổi tiền tệ chính
  sẽ quy đổi cả sổ, số tiền gốc của từng khoản vẫn được giữ.
- Tự chọn ảnh nền và biểu tượng app. Sao lưu / khôi phục file JSON, xuất CSV cho Excel.

## Cài lên iPhone

1. Mở link GitHub Pages của repo này bằng **Safari**.
2. Bấm **Chia sẻ** → **Thêm vào Màn hình chính**.

## Ghi nhanh bằng link

Mở `…/?amt=45000&place=Siêu thị&note=...` sẽ mở sẵn form với số tiền và nơi chi
(dùng được với app Phím tắt của iPhone). Thêm `&cur=USD` để ghi bằng loại tiền khác.

## Cập nhật app

Sửa file xong, tăng số `VERSION` trong `sw.js` (ví dụ `sochi-2` → `sochi-3`) rồi đẩy lên,
để điện thoại tải bản mới.
