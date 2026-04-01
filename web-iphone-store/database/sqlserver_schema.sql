/*
  SQL Server schema for Apple Meo Meo store
  Reconstructed from the ERD image the user provided.

  Assumptions:
  - Entity names in the ERD are kept as close as possible to the image.
  - Employee roles use table-per-type inheritance:
      NhanVien -> QuanLy / NhanVienBanHang / ThuNganCSKH / KyThuatVien
      ToTruongBanHang extends NhanVienBanHang
  - TaiKhoan can belong to either a customer or an employee.
  - Repair, sales, cart, review, promotion, purchase receipt, and supplier flows
    are modeled in a way that is practical for SQL Server and web integration.
*/

IF DB_ID(N'AppleMeoMeoDB') IS NULL
BEGIN
    CREATE DATABASE AppleMeoMeoDB;
END;
GO

USE AppleMeoMeoDB;
GO

/* Drop old objects in dependency order */
IF OBJECT_ID(N'dbo.ChiTietPhieuNhap', N'U') IS NOT NULL DROP TABLE dbo.ChiTietPhieuNhap;
IF OBJECT_ID(N'dbo.PhieuNhap', N'U') IS NOT NULL DROP TABLE dbo.PhieuNhap;
IF OBJECT_ID(N'dbo.NhaCungCap', N'U') IS NOT NULL DROP TABLE dbo.NhaCungCap;

IF OBJECT_ID(N'dbo.ChiTietDonHang', N'U') IS NOT NULL DROP TABLE dbo.ChiTietDonHang;
IF OBJECT_ID(N'dbo.DonHang', N'U') IS NOT NULL DROP TABLE dbo.DonHang;
IF OBJECT_ID(N'dbo.KhuyenMai', N'U') IS NOT NULL DROP TABLE dbo.KhuyenMai;
IF OBJECT_ID(N'dbo.GioHang', N'U') IS NOT NULL DROP TABLE dbo.GioHang;
IF OBJECT_ID(N'dbo.DanhGia', N'U') IS NOT NULL DROP TABLE dbo.DanhGia;
IF OBJECT_ID(N'dbo.PhieuSuaChua', N'U') IS NOT NULL DROP TABLE dbo.PhieuSuaChua;

IF OBJECT_ID(N'dbo.ToTruongBanHang', N'U') IS NOT NULL DROP TABLE dbo.ToTruongBanHang;
IF OBJECT_ID(N'dbo.NhanVienBanHang', N'U') IS NOT NULL DROP TABLE dbo.NhanVienBanHang;
IF OBJECT_ID(N'dbo.ThuNganCSKH', N'U') IS NOT NULL DROP TABLE dbo.ThuNganCSKH;
IF OBJECT_ID(N'dbo.KyThuatVien', N'U') IS NOT NULL DROP TABLE dbo.KyThuatVien;
IF OBJECT_ID(N'dbo.QuanLy', N'U') IS NOT NULL DROP TABLE dbo.QuanLy;

IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NOT NULL DROP TABLE dbo.TaiKhoan;
IF OBJECT_ID(N'dbo.SanPham', N'U') IS NOT NULL DROP TABLE dbo.SanPham;
IF OBJECT_ID(N'dbo.KhachHang', N'U') IS NOT NULL DROP TABLE dbo.KhachHang;
IF OBJECT_ID(N'dbo.NhanVien', N'U') IS NOT NULL DROP TABLE dbo.NhanVien;
GO

CREATE TABLE dbo.NhanVien
(
    NhanVienID          INT IDENTITY(1,1) PRIMARY KEY,
    MaNhanVien          NVARCHAR(20) NOT NULL UNIQUE,
    TenNhanVien         NVARCHAR(120) NOT NULL,
    NgaySinh            DATE NULL,
    GioiTinh            NVARCHAR(10) NULL,
    Email               NVARCHAR(120) NULL UNIQUE,
    SoDienThoai         NVARCHAR(20) NULL UNIQUE,
    DiaChi              NVARCHAR(255) NULL,
    NgayVaoLam          DATE NULL,
    TrangThai           NVARCHAR(30) NOT NULL DEFAULT N'HoatDong',
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.KhachHang
(
    KhachHangID         INT IDENTITY(1,1) PRIMARY KEY,
    MaKhachHang         NVARCHAR(20) NOT NULL UNIQUE,
    TenKhachHang        NVARCHAR(120) NOT NULL,
    SoDienThoai         NVARCHAR(20) NULL UNIQUE,
    DiaChi              NVARCHAR(255) NULL,
    Email               NVARCHAR(120) NULL UNIQUE,
    NgayDangKy          DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    TrangThai           NVARCHAR(30) NOT NULL DEFAULT N'HoatDong'
);
GO

CREATE TABLE dbo.TaiKhoan
(
    TaiKhoanID          INT IDENTITY(1,1) PRIMARY KEY,
    TenTaiKhoan         NVARCHAR(60) NOT NULL UNIQUE,
    MatKhauHash         NVARCHAR(255) NOT NULL,
    ChucVu              NVARCHAR(30) NOT NULL,
    NhanVienID          INT NULL,
    KhachHangID         INT NULL,
    LanDangNhapCuoi     DATETIME2 NULL,
    TrangThai           NVARCHAR(30) NOT NULL DEFAULT N'HoatDong',
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_TaiKhoan_NhanVien
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVien(NhanVienID),
    CONSTRAINT FK_TaiKhoan_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES dbo.KhachHang(KhachHangID),
    CONSTRAINT CK_TaiKhoan_Owner
        CHECK (
            (NhanVienID IS NOT NULL AND KhachHangID IS NULL)
            OR
            (NhanVienID IS NULL AND KhachHangID IS NOT NULL)
        )
);
GO

CREATE TABLE dbo.QuanLy
(
    NhanVienID              INT PRIMARY KEY,
    CapBac                  NVARCHAR(50) NULL,
    GhiChu                  NVARCHAR(255) NULL,
    CONSTRAINT FK_QuanLy_NhanVien
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVien(NhanVienID)
);
GO

CREATE TABLE dbo.KyThuatVien
(
    NhanVienID              INT PRIMARY KEY,
    ChuyenMon               NVARCHAR(100) NOT NULL,
    BacTayNghe              NVARCHAR(50) NULL,
    GhiChu                  NVARCHAR(255) NULL,
    CONSTRAINT FK_KyThuatVien_NhanVien
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVien(NhanVienID)
);
GO

CREATE TABLE dbo.ThuNganCSKH
(
    NhanVienID              INT PRIMARY KEY,
    QuayPhuTrach            NVARCHAR(50) NULL,
    GhiChu                  NVARCHAR(255) NULL,
    CONSTRAINT FK_ThuNganCSKH_NhanVien
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVien(NhanVienID)
);
GO

CREATE TABLE dbo.NhanVienBanHang
(
    NhanVienID              INT PRIMARY KEY,
    DoanhSoCaNhan           DECIMAL(18,2) NOT NULL DEFAULT 0,
    MucTieuDoanhSo          DECIMAL(18,2) NOT NULL DEFAULT 0,
    GhiChu                  NVARCHAR(255) NULL,
    CONSTRAINT FK_NhanVienBanHang_NhanVien
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVien(NhanVienID)
);
GO

CREATE TABLE dbo.ToTruongBanHang
(
    NhanVienID              INT PRIMARY KEY,
    PhanCaLamViec           NVARCHAR(100) NULL,
    KhuVucPhuTrach          NVARCHAR(100) NULL,
    BaoCaoChoQuanLyID       INT NULL,
    CONSTRAINT FK_ToTruongBanHang_NhanVienBanHang
        FOREIGN KEY (NhanVienID) REFERENCES dbo.NhanVienBanHang(NhanVienID),
    CONSTRAINT FK_ToTruongBanHang_QuanLy
        FOREIGN KEY (BaoCaoChoQuanLyID) REFERENCES dbo.QuanLy(NhanVienID)
);
GO

CREATE TABLE dbo.SanPham
(
    SanPhamID            INT IDENTITY(1,1) PRIMARY KEY,
    MaSanPham            NVARCHAR(30) NOT NULL UNIQUE,
    TenSanPham           NVARCHAR(200) NOT NULL,
    LoaiSanPham          NVARCHAR(100) NULL,
    HinhAnhURL           NVARCHAR(500) NULL,
    GiaBan               DECIMAL(18,2) NOT NULL,
    GiaNhap              DECIMAL(18,2) NULL,
    SoLuongTon           INT NOT NULL DEFAULT 0,
    MauSac               NVARCHAR(50) NULL,
    DungLuong            NVARCHAR(50) NULL,
    MoTa                 NVARCHAR(MAX) NULL,
    TrangThai            NVARCHAR(30) NOT NULL DEFAULT N'DangBan',
    CreatedAt            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CK_SanPham_GiaBan CHECK (GiaBan >= 0),
    CONSTRAINT CK_SanPham_SoLuongTon CHECK (SoLuongTon >= 0)
);
GO

CREATE TABLE dbo.KhuyenMai
(
    KhuyenMaiID          INT IDENTITY(1,1) PRIMARY KEY,
    MaKhuyenMai          NVARCHAR(30) NOT NULL UNIQUE,
    TenKhuyenMai         NVARCHAR(150) NOT NULL,
    GiaTriGiam           DECIMAL(18,2) NOT NULL,
    KieuGiamGia          NVARCHAR(20) NOT NULL DEFAULT N'TienMat',
    NgayBatDau           DATETIME2 NOT NULL,
    NgayKetThuc          DATETIME2 NOT NULL,
    DieuKienApDung       NVARCHAR(255) NULL,
    TrangThai            NVARCHAR(30) NOT NULL DEFAULT N'HoatDong',
    CONSTRAINT CK_KhuyenMai_GiaTri CHECK (GiaTriGiam >= 0),
    CONSTRAINT CK_KhuyenMai_Ngay CHECK (NgayKetThuc >= NgayBatDau)
);
GO

CREATE TABLE dbo.GioHang
(
    GioHangID            INT IDENTITY(1,1) PRIMARY KEY,
    KhachHangID          INT NOT NULL,
    SanPhamID            INT NOT NULL,
    SoLuong              INT NOT NULL DEFAULT 1,
    DonGiaTaiThoiDiem    DECIMAL(18,2) NOT NULL,
    CreatedAt            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_GioHang_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES dbo.KhachHang(KhachHangID),
    CONSTRAINT FK_GioHang_SanPham
        FOREIGN KEY (SanPhamID) REFERENCES dbo.SanPham(SanPhamID),
    CONSTRAINT UQ_GioHang UNIQUE (KhachHangID, SanPhamID),
    CONSTRAINT CK_GioHang_SoLuong CHECK (SoLuong > 0)
);
GO

CREATE TABLE dbo.DanhGia
(
    DanhGiaID            INT IDENTITY(1,1) PRIMARY KEY,
    KhachHangID          INT NOT NULL,
    SanPhamID            INT NOT NULL,
    SoDiem               INT NOT NULL,
    NoiDung              NVARCHAR(1000) NULL,
    NgayDanhGia          DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    TrangThaiDuyet       NVARCHAR(30) NOT NULL DEFAULT N'ChoDuyet',
    CONSTRAINT FK_DanhGia_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES dbo.KhachHang(KhachHangID),
    CONSTRAINT FK_DanhGia_SanPham
        FOREIGN KEY (SanPhamID) REFERENCES dbo.SanPham(SanPhamID),
    CONSTRAINT CK_DanhGia_SoDiem CHECK (SoDiem BETWEEN 1 AND 5)
);
GO

CREATE TABLE dbo.PhieuSuaChua
(
    PhieuSuaChuaID       INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieuSuaChua       NVARCHAR(30) NOT NULL UNIQUE,
    KhachHangID          INT NOT NULL,
    SanPhamID            INT NULL,
    KyThuatVienID        INT NULL,
    NhanVienTiepNhanID   INT NULL,
    MoTaLoi              NVARCHAR(1000) NOT NULL,
    TinhTrangMay         NVARCHAR(500) NULL,
    ChiPhiDuKien         DECIMAL(18,2) NULL,
    ChiPhiThucTe         DECIMAL(18,2) NULL,
    NgayTiepNhan         DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    NgayHenTra           DATETIME2 NULL,
    NgayHoanTat          DATETIME2 NULL,
    TrangThai            NVARCHAR(30) NOT NULL DEFAULT N'TiepNhan',
    GhiChu               NVARCHAR(500) NULL,
    CONSTRAINT FK_PhieuSuaChua_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES dbo.KhachHang(KhachHangID),
    CONSTRAINT FK_PhieuSuaChua_SanPham
        FOREIGN KEY (SanPhamID) REFERENCES dbo.SanPham(SanPhamID),
    CONSTRAINT FK_PhieuSuaChua_KyThuatVien
        FOREIGN KEY (KyThuatVienID) REFERENCES dbo.KyThuatVien(NhanVienID),
    CONSTRAINT FK_PhieuSuaChua_ThuNganCSKH
        FOREIGN KEY (NhanVienTiepNhanID) REFERENCES dbo.ThuNganCSKH(NhanVienID)
);
GO

CREATE TABLE dbo.DonHang
(
    DonHangID            INT IDENTITY(1,1) PRIMARY KEY,
    MaDonHang            NVARCHAR(30) NOT NULL UNIQUE,
    KhachHangID          INT NOT NULL,
    NhanVienBanHangID    INT NULL,
    KhuyenMaiID          INT NULL,
    TongTien             DECIMAL(18,2) NOT NULL DEFAULT 0,
    GiamGia              DECIMAL(18,2) NOT NULL DEFAULT 0,
    ThanhTien            AS (TongTien - GiamGia) PERSISTED,
    PhuongThucThanhToan  NVARCHAR(50) NULL,
    DiaChiGiaoHang       NVARCHAR(255) NULL,
    TrangThai            NVARCHAR(30) NOT NULL DEFAULT N'ChoXacNhan',
    NgayDatHang          DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    NgayThanhToan        DATETIME2 NULL,
    CONSTRAINT FK_DonHang_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES dbo.KhachHang(KhachHangID),
    CONSTRAINT FK_DonHang_NhanVienBanHang
        FOREIGN KEY (NhanVienBanHangID) REFERENCES dbo.NhanVienBanHang(NhanVienID),
    CONSTRAINT FK_DonHang_KhuyenMai
        FOREIGN KEY (KhuyenMaiID) REFERENCES dbo.KhuyenMai(KhuyenMaiID),
    CONSTRAINT CK_DonHang_Tien CHECK (TongTien >= 0 AND GiamGia >= 0)
);
GO

CREATE TABLE dbo.ChiTietDonHang
(
    ChiTietDonHangID     INT IDENTITY(1,1) PRIMARY KEY,
    DonHangID            INT NOT NULL,
    SanPhamID            INT NOT NULL,
    SoLuong              INT NOT NULL,
    DonGia               DECIMAL(18,2) NOT NULL,
    GiamGiaDong          DECIMAL(18,2) NOT NULL DEFAULT 0,
    ThanhTienDong        AS ((SoLuong * DonGia) - GiamGiaDong) PERSISTED,
    CONSTRAINT FK_ChiTietDonHang_DonHang
        FOREIGN KEY (DonHangID) REFERENCES dbo.DonHang(DonHangID),
    CONSTRAINT FK_ChiTietDonHang_SanPham
        FOREIGN KEY (SanPhamID) REFERENCES dbo.SanPham(SanPhamID),
    CONSTRAINT UQ_ChiTietDonHang UNIQUE (DonHangID, SanPhamID),
    CONSTRAINT CK_ChiTietDonHang_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_ChiTietDonHang_DonGia CHECK (DonGia >= 0 AND GiamGiaDong >= 0)
);
GO

CREATE TABLE dbo.NhaCungCap
(
    NhaCungCapID         INT IDENTITY(1,1) PRIMARY KEY,
    MaNhaCungCap         NVARCHAR(30) NOT NULL UNIQUE,
    TenNhaCungCap        NVARCHAR(150) NOT NULL,
    DiaChi               NVARCHAR(255) NULL,
    SoDienThoai          NVARCHAR(20) NULL,
    Email                NVARCHAR(120) NULL,
    GhiChu               NVARCHAR(255) NULL
);
GO

CREATE TABLE dbo.PhieuNhap
(
    PhieuNhapID          INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieuNhap          NVARCHAR(30) NOT NULL UNIQUE,
    NhaCungCapID         INT NOT NULL,
    QuanLyDuyetID        INT NULL,
    TongTienNhap         DECIMAL(18,2) NOT NULL DEFAULT 0,
    NgayNhap             DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    TrangThai            NVARCHAR(30) NOT NULL DEFAULT N'ChoDuyet',
    GhiChu               NVARCHAR(255) NULL,
    CONSTRAINT FK_PhieuNhap_NhaCungCap
        FOREIGN KEY (NhaCungCapID) REFERENCES dbo.NhaCungCap(NhaCungCapID),
    CONSTRAINT FK_PhieuNhap_QuanLy
        FOREIGN KEY (QuanLyDuyetID) REFERENCES dbo.QuanLy(NhanVienID),
    CONSTRAINT CK_PhieuNhap_TongTien CHECK (TongTienNhap >= 0)
);
GO

CREATE TABLE dbo.ChiTietPhieuNhap
(
    ChiTietPhieuNhapID   INT IDENTITY(1,1) PRIMARY KEY,
    PhieuNhapID          INT NOT NULL,
    SanPhamID            INT NOT NULL,
    SoLuong              INT NOT NULL,
    DonGiaNhap           DECIMAL(18,2) NOT NULL,
    ThanhTienNhap        AS (SoLuong * DonGiaNhap) PERSISTED,
    CONSTRAINT FK_ChiTietPhieuNhap_PhieuNhap
        FOREIGN KEY (PhieuNhapID) REFERENCES dbo.PhieuNhap(PhieuNhapID),
    CONSTRAINT FK_ChiTietPhieuNhap_SanPham
        FOREIGN KEY (SanPhamID) REFERENCES dbo.SanPham(SanPhamID),
    CONSTRAINT UQ_ChiTietPhieuNhap UNIQUE (PhieuNhapID, SanPhamID),
    CONSTRAINT CK_ChiTietPhieuNhap_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_ChiTietPhieuNhap_DonGia CHECK (DonGiaNhap >= 0)
);
GO

/* Helpful indexes for web queries */
CREATE INDEX IX_SanPham_TenSanPham ON dbo.SanPham(TenSanPham);
CREATE INDEX IX_SanPham_LoaiSanPham ON dbo.SanPham(LoaiSanPham);
CREATE INDEX IX_DonHang_KhachHangID ON dbo.DonHang(KhachHangID);
CREATE INDEX IX_DonHang_NgayDatHang ON dbo.DonHang(NgayDatHang);
CREATE INDEX IX_GioHang_KhachHangID ON dbo.GioHang(KhachHangID);
CREATE INDEX IX_DanhGia_SanPhamID ON dbo.DanhGia(SanPhamID);
CREATE INDEX IX_PhieuSuaChua_KhachHangID ON dbo.PhieuSuaChua(KhachHangID);
CREATE INDEX IX_PhieuNhap_NhaCungCapID ON dbo.PhieuNhap(NhaCungCapID);
GO

/* Sample admin account seed mapped to your current frontend login */
INSERT INTO dbo.NhanVien (MaNhanVien, TenNhanVien, NgaySinh, GioiTinh, Email, SoDienThoai, DiaChi, NgayVaoLam)
VALUES (N'NV0001', N'Admin Apple Meo Meo', '1995-01-01', N'Nam', N'admin@meomeo.vn', N'0900000001', N'Ha Noi', GETDATE());
GO

INSERT INTO dbo.QuanLy (NhanVienID, CapBac, GhiChu)
SELECT NhanVienID, N'Admin', N'Tai khoan quan tri mac dinh'
FROM dbo.NhanVien
WHERE MaNhanVien = N'NV0001';
GO

INSERT INTO dbo.TaiKhoan (TenTaiKhoan, MatKhauHash, ChucVu, NhanVienID)
SELECT N'admin@meomeo.vn', N'admin123', N'admin', NhanVienID
FROM dbo.NhanVien
WHERE MaNhanVien = N'NV0001';
GO

/* Sample product seed using local image in public/images/products */
INSERT INTO dbo.SanPham
(
    MaSanPham,
    TenSanPham,
    LoaiSanPham,
    HinhAnhURL,
    GiaBan,
    GiaNhap,
    SoLuongTon,
    MauSac,
    DungLuong,
    MoTa,
    TrangThai
)
VALUES
(
    N'SP0001',
    N'iPhone 17 Pro 256GB Chinh Hang',
    N'Dien thoai',
    N'/images/products/iphone17pro.jpg',
    33690000,
    29800000,
    15,
    N'Titan Tu Nhien',
    N'256GB',
    N'iPhone 17 Pro chinh hang, hinh anh lay tu thu muc public/images/products.',
    N'DangBan'
);
GO
