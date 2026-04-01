USE AppleMeoMeoDB;
GO

IF OBJECT_ID(N'dbo.SanPham', N'U') IS NULL
BEGIN
    THROW 50001, N'Bang dbo.SanPham chua ton tai trong database AppleMeoMeoDB.', 1;
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/iphone16pro.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG001', N'iPhone 16 Pro 128GB Chinh Hang', N'Dien thoai',
        N'/images/products/iphone16pro.jpg', 28990000, 25500000,
        10, N'Titan Tu Nhien', N'128GB',
        N'San pham tao tu file anh iphone16pro.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/iphone17.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG002', N'iPhone 17 128GB Chinh Hang', N'Dien thoai',
        N'/images/products/iphone17.jpg', 21990000, 19600000,
        14, N'Den', N'128GB',
        N'San pham tao tu file anh iphone17.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/iphone17pro.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG003', N'iPhone 17 Pro 256GB Chinh Hang', N'Dien thoai',
        N'/images/products/iphone17pro.jpg', 33690000, 29800000,
        15, N'Titan Tu Nhien', N'256GB',
        N'San pham tao tu file anh iphone17pro.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/iphone17promax.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG004', N'iPhone 17 Pro Max 256GB Chinh Hang', N'Dien thoai',
        N'/images/products/iphone17promax.jpg', 36990000, 32900000,
        12, N'Titan Sa Mac', N'256GB',
        N'San pham tao tu file anh iphone17promax.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/samsunga56.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG005', N'Samsung Galaxy A56 5G 8GB 128GB', N'Dien thoai',
        N'/images/products/samsunga56.jpg', 8190000, 6950000,
        25, N'Xanh La', N'128GB',
        N'San pham tao tu file anh samsunga56.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/samsungs25ultra.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG006', N'Samsung Galaxy S25 Ultra 12GB 256GB', N'Dien thoai',
        N'/images/products/samsungs25ultra.jpg', 30490000, 27100000,
        11, N'Xam Titan', N'256GB',
        N'San pham tao tu file anh samsungs25ultra.jpg', N'DangBan'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SanPham WHERE HinhAnhURL = N'/images/products/xiaomi15t.jpg')
BEGIN
    INSERT INTO dbo.SanPham
    (
        MaSanPham, TenSanPham, LoaiSanPham, HinhAnhURL, GiaBan, GiaNhap,
        SoLuongTon, MauSac, DungLuong, MoTa, TrangThai
    )
    VALUES
    (
        N'SPIMG007', N'Xiaomi 15T 12GB 512GB', N'Dien thoai',
        N'/images/products/xiaomi15t.jpg', 11390000, 9800000,
        18, N'Den', N'512GB',
        N'San pham tao tu file anh xiaomi15t.jpg', N'DangBan'
    );
END;
GO
