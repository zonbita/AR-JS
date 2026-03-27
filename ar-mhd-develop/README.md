# AR Baby Development - Hệ thống AR theo tháng

## Tổng quan

Hệ thống AR hiển thị sự phát triển của em bé qua 9 tháng với model 3D và âm thanh tương ứng.

## Cách sử dụng

### 1. Truy cập trực tiếp

- Mở `index.html` - Mặc định tháng 1
- Mở `test.html` - Trang test các tháng

### 2. Từ Landing Page

Sử dụng URL parameters để chỉ định tháng:

```
index.html?month=1  # Tháng 1
index.html?month=2  # Tháng 2
index.html?month=3  # Tháng 3
...
index.html?month=9  # Tháng 9
```

### 3. Cấu trúc thư mục

```
module/source/
├── month1/
│   ├── baby1.glb
│   ├── baby1.usdz
│   └── voice bé 1.MP3
├── month2/
│   ├── baby2.glb
│   ├── baby2.usdz
│   └── voice bé 2.MP3
...
└── month9/
    ├── baby9.glb
    ├── baby9.usdz
    └── voice bé 9.MP3
```

## Tính năng

### AR Support

- **iOS**: AR Quick Look (iOS 12+)
- **Android**: WebXR AR
- **Desktop**: Model viewer với camera controls

### Tương tác

- **Xem AR**: Kích hoạt chế độ AR
- **Play Animation**: Phát animation của model
- **Đổi Quà**: Link đến store (có countdown 10s)

### Responsive

- Tối ưu cho mobile và desktop
- Background animation với particles
- Floating elements (stars, hearts, clouds)

## Cách tích hợp với Landing Page

### 1. Link trực tiếp

```html
<a href="ar-page/index.html?month=3">Xem AR tháng 3</a>
```

### 2. JavaScript redirect

```javascript
function openAR(month) {
  window.open(`ar-page/index.html?month=${month}`, "_blank");
}
```

### 3. Form submission

```html
<form action="ar-page/index.html" method="GET">
  <select name="month">
    <option value="1">Tháng 1</option>
    <option value="2">Tháng 2</option>
    <!-- ... -->
  </select>
  <button type="submit">Xem AR</button>
</form>
```

## File quan trọng

- `index.html` - Trang chính AR
- `js/main.js` - Logic xử lý AR và URL parameters
- `css/styles.css` - Styling và animations
- `test.html` - Trang test các tháng
- `module/source/monthX/` - Assets cho từng tháng

## Browser Support

- **Chrome/Edge**: WebXR AR
- **Safari iOS**: AR Quick Look
- **Firefox**: Model viewer (không AR)
- **Mobile**: Tối ưu cho touch interaction

## Lưu ý

1. **File .usdz**: Cần cho iOS AR Quick Look
2. **File .glb**: Cần cho WebXR và model viewer
3. **Audio**: Format MP3, tự động loop
4. **Performance**: Model size nên < 10MB cho mobile

## Troubleshooting

### AR không hoạt động

- Kiểm tra HTTPS (required cho AR)
- Kiểm tra device support
- Test trên mobile device thật

### Model không load

- Kiểm tra file path
- Kiểm tra file format (.glb, .usdz)
- Kiểm tra console errors

### Audio không phát

- Kiểm tra user interaction (click/touch)
- Kiểm tra file path và format
- Kiểm tra browser autoplay policy
