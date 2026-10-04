# English Learning Assistant

PWA học tiếng Anh bằng HTML, CSS và JavaScript thuần. Ứng dụng có hai lộ trình IELTS và giao tiếp cơ bản kéo dài tối đa 12 tuần, tự điều chỉnh theo kết quả từng tuần.

## Chạy thử

Ứng dụng cần chạy qua HTTP (không mở trực tiếp `file://`). Có thể dùng bất kỳ static server nào:

```powershell
npx serve -l 8085 .
```

Mở `http://localhost:8085`. Khi Firebase chưa cấu hình, màn hình đăng nhập sẽ hiện nút **Dùng bản demo trên thiết bị** để kiểm tra toàn bộ learning loop cục bộ.

## Cài PWA trên điện thoại

- Production phải chạy qua HTTPS; Firebase Hosting đáp ứng điều kiện này.
- Android/Chrome: nhấn **Cài ứng dụng trên thiết bị** để mở native install prompt. Nếu prompt chưa sẵn sàng, app hiển thị hướng dẫn cài từ menu trình duyệt.
- iPhone/iPad: nhấn nút cài đặt để xem hướng dẫn **Chia sẻ → Thêm vào Màn hình chính → Thêm**.
- Khi đã chạy ở chế độ standalone, các nút và banner cài đặt sẽ tự ẩn.

Manifest sử dụng icon PNG 192px, 512px, maskable 512px và Apple touch icon 180px. Service worker phải đăng ký thành công trước khi trình duyệt đánh giá app là installable.

## Cấu hình Firebase

1. Tạo một Firebase project mới và Web App.
2. Bật Authentication > Google.
3. Tạo Firestore Database.
4. Thêm `localhost` và domain hosting vào Authorized domains.
5. Thay placeholder trong `js/config.js` bằng Firebase Web config.
6. Copy `.firebaserc.example` thành `.firebaserc`, thay project ID.
7. Deploy rules trước khi dùng production: `firebase deploy --only firestore:rules`.

Ứng dụng dùng Google popup trên cả mobile và desktop để hoạt động ổn định khi deploy bằng GitHub Pages hoặc static host khác. `authDomain` giữ nguyên domain Firebase, vì GitHub Pages không phục vụ endpoint `/__/auth/handler`. Firestore rules chỉ cho người dùng truy cập subtree của chính `uid`.

## Gemini

Vào **Cài đặt**, nhập Gemini API key của chính người dùng, tải danh sách model và chọn model. Key mặc định chỉ giữ trong session; chỉ được đưa vào `localStorage` khi bật **Ghi nhớ trên thiết bị này**. Key không được ghi lên Firestore.

Writing/short answer dùng structured JSON feedback. Phiên speaking beta tìm model có capability `bidiGenerateContent`, stream PCM qua Gemini Live và chỉ lưu transcript/feedback, không lưu audio.

## Kiểm thử

```powershell
npm test
```

Để kiểm thử Auth/Firestore rules, cài Firebase CLI theo cách bạn quản lý công cụ rồi chạy `firebase emulators:start`; cấu hình emulator đã có trong `firebase.json`.

## Cấu trúc chính

- `data/`: curriculum nền, nội dung mở rộng 12 tuần, diagnostic quiz và Grammar Spine A1–B2.
- `js/core/`: local store và plan/adaptation engine.
- `js/services/`: Firebase, Gemini và realtime speaking.
- `sw.js`: app-shell cache và offline fallback.
