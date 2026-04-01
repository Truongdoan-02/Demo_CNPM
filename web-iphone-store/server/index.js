import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import sql from 'mssql'
import { createHash } from 'node:crypto'

const app = express()
const port = Number(process.env.API_PORT || 3001)
const rawServer = process.env.DB_SERVER || 'localhost'
const [dbServer, dbInstance] = rawServer.includes('\\') ? rawServer.split('\\') : [rawServer, process.env.DB_INSTANCE || undefined]
const dbConfig = {
  server: dbServer,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'AppleMeoMeoDB',
  options: { encrypt: (process.env.DB_ENCRYPT || 'false') === 'true', trustServerCertificate: (process.env.DB_TRUST_CERT || 'true') === 'true', instanceName: dbInstance }
}
if (!dbInstance) dbConfig.port = Number(process.env.DB_PORT || 1433)

app.use(cors())
app.use(express.json())

let poolPromise
const getPool = () => (poolPromise ||= sql.connect(dbConfig))
const hashPassword = value => createHash('sha256').update(String(value)).digest('hex')
const checkPassword = (plain, stored) => stored === String(plain) || stored === hashPassword(plain)
const makeCode = prefix => `${prefix}${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`

const STATUS = {
  account: { pending: 'ChoKichHoat', active: 'DangHoatDong', locked: 'BiKhoa', disabled: 'VoHieuHoa' },
  supplier: { active: 'DangHoatDong', paused: 'TamNgung', blocked: 'BiKhoa', stopped: 'NgungHopTac', deleted: 'DaXoa' },
  product: { fresh: 'Moi', selling: 'DangKinhDoanh', empty: 'TamHetHang', stopped: 'NgungKinhDoanh' },
  purchase: { draft: 'TaoMoi', pending: 'ChoDuyet', approved: 'DaDuyetDatHang', stocked: 'DaNhapKho', canceled: 'DaHuy' },
  order: { pending: 'ChoThanhToan', processing: 'DangXuLy', shipping: 'DangGiaoHang', done: 'HoanThanh', refund: 'TraHangHoanTien', canceled: 'DaHuy' },
  cart: { empty: 'Trong', shopping: 'DangChonHang', paying: 'DangThanhToan', converted: 'DaChuyenThanhDon', abandoned: 'BiBoQuen' },
  repair: { received: 'MoiTiepNhan', checking: 'DangKiemTra', quoting: 'ChoBaoGia', waiting: 'ChoLinhKien', fixing: 'DangSuaChua', ready: 'ChoTraKhach', returned: 'DaTraKhach', canceled: 'DaHuy' }
}

const WORKFLOW = {
  account: { kichHoat: ['ChoKichHoat', 'DangHoatDong'], khoaTam: ['DangHoatDong', 'BiKhoa'], moKhoa: ['BiKhoa', 'DangHoatDong'], voHieuHoa: ['DangHoatDong|BiKhoa', 'VoHieuHoa'], khoiPhuc: ['VoHieuHoa', 'DangHoatDong'] },
  supplier: { tamDungNhap: ['DangHoatDong', 'TamNgung'], nhapHangTroLai: ['TamNgung', 'DangHoatDong'], viPhamCamKet: ['DangHoatDong', 'BiKhoa'], giaiQuyetViPham: ['BiKhoa', 'DangHoatDong'], hetHopDong: ['DangHoatDong|TamNgung', 'NgungHopTac'], xoaKhoiDanhSach: ['NgungHopTac', 'DaXoa'], xoaVinhVien: ['BiKhoa', 'DaXoa'] },
  product: { nhapLanDau: ['Moi', 'DangKinhDoanh'], banHet: ['DangKinhDoanh', 'TamHetHang'], nhapThem: ['TamHetHang', 'DangKinhDoanh'], ngungKinhDoanh: ['Moi|DangKinhDoanh|TamHetHang', 'NgungKinhDoanh'], moBanLai: ['NgungKinhDoanh', 'DangKinhDoanh'] },
  purchase: { guiDuyet: ['TaoMoi', 'ChoDuyet'], duyetDatHang: ['ChoDuyet', 'DaDuyetDatHang'], tuChoiNhap: ['ChoDuyet', 'DaHuy'], nhaCungCapHuy: ['DaDuyetDatHang', 'DaHuy'], nhapKho: ['DaDuyetDatHang', 'DaNhapKho'] },
  order: { thanhToanThanhCong: ['ChoThanhToan', 'DangXuLy'], huyDon: ['ChoThanhToan', 'DaHuy'], dongGoiGiaoDVVC: ['DangXuLy', 'DangGiaoHang'], nhanTaiQuay: ['DangXuLy', 'HoanThanh'], giaoThanhCong: ['DangGiaoHang', 'HoanThanh'], giaoThatBai: ['DangGiaoHang', 'TraHangHoanTien'], khieuNaiDoiTra: ['HoanThanh', 'TraHangHoanTien'] },
  cart: { themSanPham: ['Trong|BiBoQuen', 'DangChonHang'], nhanDatHang: ['DangChonHang', 'DangThanhToan'], chuyenThanhDon: ['DangThanhToan', 'DaChuyenThanhDon'], hetPhien: ['DangChonHang', 'BiBoQuen'], quayLai: ['BiBoQuen', 'DangChonHang'], xoaHet: ['DangChonHang|BiBoQuen', 'Trong'] },
  repair: { kiemTra: ['MoiTiepNhan', 'DangKiemTra'], xacDinhBaoGia: ['DangKiemTra', 'ChoBaoGia'], dongYCoSanLinhKien: ['ChoBaoGia', 'DangSuaChua'], dongYKhoHetLinhKien: ['ChoBaoGia', 'ChoLinhKien'], linhKienVe: ['ChoLinhKien', 'DangSuaChua'], phatSinhLoiMoi: ['DangSuaChua', 'DangKiemTra'], hoanThanhChoTra: ['DangSuaChua', 'ChoTraKhach'], khachNhanMay: ['ChoTraKhach', 'DaTraKhach'], huyYeuCau: ['ChoBaoGia|DangKiemTra', 'DaHuy'] }
}

const actionsFor = (entity, status) => Object.entries(WORKFLOW[entity] || {}).filter(([, [from]]) => from.split('|').includes(status)).map(([key, [, nextStatus]]) => ({ key, nextStatus }))
const nextStatus = (entity, action, status) => {
  const rule = WORKFLOW[entity]?.[action]
  if (!rule || !rule[0].split('|').includes(status)) throw Object.assign(new Error('Chuyen trang thai khong hop le.'), { statusCode: 400 })
  return rule[1]
}

async function ensureSchema() {
  const pool = await getPool()
  await pool.request().query("IF COL_LENGTH('dbo.NhaCungCap','TrangThai') IS NULL ALTER TABLE dbo.NhaCungCap ADD TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_NCC_TrangThai DEFAULT N'DangHoatDong' WITH VALUES;")
  await pool.request().query("IF COL_LENGTH('dbo.GioHang','TrangThai') IS NULL ALTER TABLE dbo.GioHang ADD TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_GioHang_TrangThai DEFAULT N'DangChonHang' WITH VALUES;")
  await pool.request().query("UPDATE dbo.TaiKhoan SET TrangThai = CASE WHEN TrangThai = N'HoatDong' THEN N'DangHoatDong' ELSE TrangThai END; UPDATE dbo.SanPham SET TrangThai = CASE WHEN TrangThai = N'DangBan' AND SoLuongTon > 0 THEN N'DangKinhDoanh' WHEN TrangThai = N'DangBan' AND SoLuongTon = 0 THEN N'TamHetHang' WHEN TrangThai = N'NgungBan' THEN N'NgungKinhDoanh' ELSE TrangThai END; UPDATE dbo.DonHang SET TrangThai = CASE WHEN TrangThai = N'ChoXacNhan' THEN N'ChoThanhToan' ELSE TrangThai END; UPDATE dbo.PhieuSuaChua SET TrangThai = CASE WHEN TrangThai = N'TiepNhan' THEN N'MoiTiepNhan' ELSE TrangThai END;")
  await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.NhaCungCap) INSERT INTO dbo.NhaCungCap (MaNhaCungCap,TenNhaCungCap,DiaChi,SoDienThoai,Email,GhiChu,TrangThai) VALUES (N'NCC001',N'Apple Meo Meo Supply',N'Ha Noi',N'0981000001',N'supply@meomeo.vn',N'Du lieu mau workflow',N'DangHoatDong');")
}

async function adminStats() {
  const pool = await getPool()
  const [a, b, c] = await Promise.all([pool.request().query('SELECT COUNT(*) AS value FROM dbo.SanPham'), pool.request().query('SELECT COUNT(*) AS value FROM dbo.KhachHang'), pool.request().query('SELECT ISNULL(SUM(GiaBan * SoLuongTon),0) AS value FROM dbo.SanPham')])
  return { productCount: a.recordset[0].value || 0, customerCount: b.recordset[0].value || 0, inventoryValue: Number(c.recordset[0].value || 0) }
}

async function listProducts(includeStopped = false) {
  const pool = await getPool()
  const where = includeStopped ? '' : `WHERE TrangThai <> N'${STATUS.product.stopped}'`
  const result = await pool.request().query(`SELECT SanPhamID AS id, MaSanPham AS code, TenSanPham AS model, ISNULL(LoaiSanPham,N'Dien thoai') AS category, HinhAnhURL AS imageUrl, GiaBan AS price, ISNULL(GiaNhap,GiaBan) AS originalPrice, SoLuongTon AS stock, MauSac AS color, DungLuong AS storage, MoTa AS description, TrangThai AS status FROM dbo.SanPham ${where} ORDER BY SanPhamID DESC`)
  return result.recordset.map(row => ({ ...row, price: Number(row.price), originalPrice: Number(row.originalPrice), stock: Number(row.stock), actions: actionsFor('product', row.status) }))
}

async function listAccounts() {
  const pool = await getPool()
  const result = await pool.request().query("SELECT tk.TaiKhoanID AS id, tk.TenTaiKhoan AS username, tk.ChucVu AS role, tk.TrangThai AS status, tk.KhachHangID AS customerId, COALESCE(kh.TenKhachHang,nv.TenNhanVien,tk.TenTaiKhoan) AS fullName, COALESCE(kh.Email,nv.Email,N'') AS email, COALESCE(kh.SoDienThoai,nv.SoDienThoai,N'') AS phone, COALESCE(kh.DiaChi,nv.DiaChi,N'') AS address, COALESCE(kh.MaKhachHang,N'') AS customerCode FROM dbo.TaiKhoan tk LEFT JOIN dbo.KhachHang kh ON tk.KhachHangID = kh.KhachHangID LEFT JOIN dbo.NhanVien nv ON tk.NhanVienID = nv.NhanVienID ORDER BY tk.TaiKhoanID DESC")
  return result.recordset.map(row => ({ ...row, role: row.role === 'admin' ? 'admin' : 'customer', actions: actionsFor('account', row.status) }))
}

async function listSuppliers() {
  const pool = await getPool()
  const result = await pool.request().query("SELECT NhaCungCapID AS id, MaNhaCungCap AS code, TenNhaCungCap AS name, SoDienThoai AS phone, Email AS email, DiaChi AS address, TrangThai AS status FROM dbo.NhaCungCap ORDER BY NhaCungCapID DESC")
  return result.recordset.map(row => ({ ...row, actions: actionsFor('supplier', row.status) }))
}

async function listPurchaseOrders() {
  const pool = await getPool()
  const result = await pool.request().query("SELECT pn.PhieuNhapID AS id, pn.MaPhieuNhap AS code, ncc.TenNhaCungCap AS supplierName, pn.TongTienNhap AS totalAmount, pn.TrangThai AS status, pn.GhiChu AS note FROM dbo.PhieuNhap pn INNER JOIN dbo.NhaCungCap ncc ON pn.NhaCungCapID = ncc.NhaCungCapID ORDER BY pn.PhieuNhapID DESC")
  return result.recordset.map(row => ({ ...row, totalAmount: Number(row.totalAmount), actions: actionsFor('purchase', row.status) }))
}

async function listOrders(customerId) {
  const pool = await getPool()
  const req = pool.request()
  const where = customerId ? 'WHERE dh.KhachHangID = @CustomerId' : ''
  if (customerId) req.input('CustomerId', sql.Int, Number(customerId))
  const result = await req.query(`SELECT dh.DonHangID AS id, dh.MaDonHang AS code, kh.TenKhachHang AS customerName, dh.TrangThai AS status, dh.TongTien AS totalAmount, dh.PhuongThucThanhToan AS paymentMethod, dh.DiaChiGiaoHang AS shippingAddress, (SELECT STRING_AGG(sp.TenSanPham + N' x' + CAST(ct.SoLuong AS NVARCHAR(10)), N', ') FROM dbo.ChiTietDonHang ct INNER JOIN dbo.SanPham sp ON ct.SanPhamID = sp.SanPhamID WHERE ct.DonHangID = dh.DonHangID) AS itemSummary FROM dbo.DonHang dh INNER JOIN dbo.KhachHang kh ON dh.KhachHangID = kh.KhachHangID ${where} ORDER BY dh.DonHangID DESC`)
  return result.recordset.map(row => ({ ...row, totalAmount: Number(row.totalAmount), itemSummary: row.itemSummary || '', actions: actionsFor('order', row.status) }))
}

async function listRepairs(customerId) {
  const pool = await getPool()
  const req = pool.request()
  const where = customerId ? 'WHERE p.KhachHangID = @CustomerId' : ''
  if (customerId) req.input('CustomerId', sql.Int, Number(customerId))
  const result = await req.query(`SELECT p.PhieuSuaChuaID AS id, p.MaPhieuSuaChua AS code, kh.TenKhachHang AS customerName, ISNULL(sp.TenSanPham,N'San pham thu cong') AS productName, p.MoTaLoi AS issue, p.TrangThai AS status, ISNULL(p.ChiPhiDuKien,0) AS estimatedCost, ISNULL(p.ChiPhiThucTe,0) AS finalCost FROM dbo.PhieuSuaChua p INNER JOIN dbo.KhachHang kh ON p.KhachHangID = kh.KhachHangID LEFT JOIN dbo.SanPham sp ON p.SanPhamID = sp.SanPhamID ${where} ORDER BY p.PhieuSuaChuaID DESC`)
  return result.recordset.map(row => ({ ...row, estimatedCost: Number(row.estimatedCost), finalCost: Number(row.finalCost), actions: actionsFor('repair', row.status) }))
}

async function getCart(customerId) {
  const pool = await getPool()
  const result = await pool.request().input('CustomerId', sql.Int, Number(customerId)).query("SELECT gh.GioHangID AS id, gh.KhachHangID AS customerId, gh.SanPhamID AS productId, gh.SoLuong AS quantity, gh.DonGiaTaiThoiDiem AS unitPrice, gh.TrangThai AS status, sp.TenSanPham AS model, sp.HinhAnhURL AS imageUrl, sp.SoLuongTon AS stock FROM dbo.GioHang gh INNER JOIN dbo.SanPham sp ON gh.SanPhamID = sp.SanPhamID WHERE gh.KhachHangID = @CustomerId ORDER BY gh.GioHangID DESC")
  const items = result.recordset.map(row => ({ ...row, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), stock: Number(row.stock) }))
  const status = items.length ? items.find(item => item.status !== STATUS.cart.converted)?.status || STATUS.cart.converted : STATUS.cart.empty
  return { customerId: Number(customerId), status, items, totalAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), actions: actionsFor('cart', status) }
}

app.get('/', (_req, res) => res.json({ ok: true, message: 'Workflow API is running.' }))
app.get('/api/health', async (_req, res) => { try { const pool = await getPool(); const result = await pool.request().query('SELECT DB_NAME() AS databaseName'); res.json({ ok: true, database: result.recordset[0]?.databaseName ?? dbConfig.database }) } catch (error) { res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'SQL Server connection failed' }) } })
app.get('/api/admin/stats', async (_req, res) => { try { res.json(await adminStats()) } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the tai thong ke.' }) } })
app.get('/api/products', async (_req, res) => { try { res.json(await listProducts(false)) } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the tai san pham.' }) } })
app.get('/api/dashboard', async (req, res) => { try { const customerId = req.query.customerId ? Number(req.query.customerId) : undefined; const payload = { stats: await adminStats(), accounts: await listAccounts(), suppliers: await listSuppliers(), products: await listProducts(true), purchaseOrders: await listPurchaseOrders(), orders: await listOrders(), repairs: await listRepairs() }; if (customerId) { payload.customerCart = await getCart(customerId); payload.customerOrders = await listOrders(customerId); payload.customerRepairs = await listRepairs(customerId) } res.json(payload) } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the tai dashboard.' }) } })

app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body ?? {}
  if (!String(identifier || '').trim() || !String(password || '').trim()) return res.status(400).json({ message: 'Vui long nhap ten dang nhap hoac email va mat khau.' })
  try {
    const pool = await getPool()
    const result = await pool.request().input('Identifier', sql.NVarChar(120), String(identifier).trim().toLowerCase()).query("SELECT TOP 1 tk.TaiKhoanID AS id, tk.TenTaiKhoan AS username, tk.MatKhauHash AS passwordHash, tk.ChucVu AS role, tk.TrangThai AS status, tk.KhachHangID AS customerId, COALESCE(kh.TenKhachHang,nv.TenNhanVien,tk.TenTaiKhoan) AS fullName, COALESCE(kh.Email,nv.Email,N'') AS email, COALESCE(kh.SoDienThoai,nv.SoDienThoai,N'') AS phone, COALESCE(kh.DiaChi,nv.DiaChi,N'') AS address, COALESCE(kh.MaKhachHang,N'') AS customerCode FROM dbo.TaiKhoan tk LEFT JOIN dbo.KhachHang kh ON tk.KhachHangID = kh.KhachHangID LEFT JOIN dbo.NhanVien nv ON tk.NhanVienID = nv.NhanVienID WHERE LOWER(tk.TenTaiKhoan)=@Identifier OR LOWER(ISNULL(kh.Email,''))=@Identifier OR LOWER(ISNULL(nv.Email,''))=@Identifier")
    const row = result.recordset[0]
    if (!row || !checkPassword(password, row.passwordHash)) return res.status(401).json({ message: 'Ten dang nhap, email hoac mat khau khong dung.' })
    if (row.status !== STATUS.account.active) return res.status(403).json({ message: row.status === STATUS.account.pending ? 'Tai khoan dang cho kich hoat.' : row.status === STATUS.account.locked ? 'Tai khoan dang bi khoa.' : 'Tai khoan da bi vo hieu hoa.' })
    res.json({ account: { id: row.id, fullName: row.fullName, username: row.username, email: row.email, role: row.role === 'admin' ? 'admin' : 'customer', phone: row.phone, address: row.address, customerCode: row.customerCode, customerId: row.customerId ?? null, status: row.status } })
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Dang nhap that bai.' }) }
})

app.post('/api/register', async (req, res) => {
  const { username, fullName, phone, address, email, password } = req.body ?? {}
  const user = String(username || '').trim(), name = String(fullName || '').trim(), tel = String(phone || '').trim(), addr = String(address || '').trim(), mail = String(email || '').trim().toLowerCase(), pwd = String(password || '')
  if (!user || !name || !tel || !addr || !mail || !pwd) return res.status(400).json({ message: 'Vui long nhap day du thong tin dang ky.' })
  try {
    const pool = await getPool()
    const dupKh = await pool.request().input('Email', sql.NVarChar(120), mail).input('Phone', sql.NVarChar(20), tel).query("SELECT TOP 1 KhachHangID FROM dbo.KhachHang WHERE LOWER(Email)=@Email OR SoDienThoai=@Phone")
    if (dupKh.recordset.length) return res.status(409).json({ message: 'Email hoac so dien thoai da duoc dang ky.' })
    const dupTk = await pool.request().input('Username', sql.NVarChar(60), user).query("SELECT TOP 1 TaiKhoanID FROM dbo.TaiKhoan WHERE LOWER(TenTaiKhoan)=LOWER(@Username)")
    if (dupTk.recordset.length) return res.status(409).json({ message: 'Ten dang nhap da ton tai.' })
    const tx = new sql.Transaction(pool); await tx.begin()
    try {
      const kh = await new sql.Request(tx).input('MaKhachHang', sql.NVarChar(20), makeCode('KH')).input('TenKhachHang', sql.NVarChar(120), name).input('SoDienThoai', sql.NVarChar(20), tel).input('DiaChi', sql.NVarChar(255), addr).input('Email', sql.NVarChar(120), mail).query("INSERT INTO dbo.KhachHang (MaKhachHang,TenKhachHang,SoDienThoai,DiaChi,Email) OUTPUT INSERTED.KhachHangID AS id VALUES (@MaKhachHang,@TenKhachHang,@SoDienThoai,@DiaChi,@Email)")
      await new sql.Request(tx).input('TenTaiKhoan', sql.NVarChar(60), user).input('MatKhauHash', sql.NVarChar(255), hashPassword(pwd)).input('ChucVu', sql.NVarChar(30), 'customer').input('KhachHangID', sql.Int, kh.recordset[0].id).input('TrangThai', sql.NVarChar(30), STATUS.account.pending).query("INSERT INTO dbo.TaiKhoan (TenTaiKhoan,MatKhauHash,ChucVu,KhachHangID,TrangThai) VALUES (@TenTaiKhoan,@MatKhauHash,@ChucVu,@KhachHangID,@TrangThai)")
      await tx.commit()
      res.status(201).json({ message: 'Dang ky thanh cong. Tai khoan dang cho kich hoat.' })
    } catch (error) { await tx.rollback(); throw error }
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Dang ky that bai.' }) }
})

app.post('/api/products', async (req, res) => {
  const { model, category, imageUrl, price, originalPrice, stock, color, storage, description } = req.body ?? {}
  if (!String(model || '').trim() || Number(price) <= 0) return res.status(400).json({ message: 'Ten san pham va gia ban la bat buoc.' })
  try {
    const pool = await getPool()
    const out = await pool.request().input('MaSanPham', sql.NVarChar(30), makeCode('SP')).input('TenSanPham', sql.NVarChar(200), String(model).trim()).input('LoaiSanPham', sql.NVarChar(100), String(category || 'Dien thoai').trim()).input('HinhAnhURL', sql.NVarChar(500), imageUrl ? String(imageUrl).trim() : null).input('GiaBan', sql.Decimal(18, 2), Number(price)).input('GiaNhap', sql.Decimal(18, 2), Number(originalPrice || price)).input('SoLuongTon', sql.Int, Number(stock || 0)).input('MauSac', sql.NVarChar(50), color ? String(color).trim() : null).input('DungLuong', sql.NVarChar(50), storage ? String(storage).trim() : null).input('MoTa', sql.NVarChar(sql.MAX), description ? String(description).trim() : null).input('TrangThai', sql.NVarChar(30), STATUS.product.fresh).query("INSERT INTO dbo.SanPham (MaSanPham,TenSanPham,LoaiSanPham,HinhAnhURL,GiaBan,GiaNhap,SoLuongTon,MauSac,DungLuong,MoTa,TrangThai) OUTPUT INSERTED.SanPhamID AS id VALUES (@MaSanPham,@TenSanPham,@LoaiSanPham,@HinhAnhURL,@GiaBan,@GiaNhap,@SoLuongTon,@MauSac,@DungLuong,@MoTa,@TrangThai)")
    res.status(201).json((await listProducts(true)).find(item => item.id === out.recordset[0].id))
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the them san pham.' }) }
})

app.post('/api/purchase-orders', async (req, res) => {
  const supplierId = Number(req.body?.supplierId), productId = Number(req.body?.productId), quantity = Number(req.body?.quantity), unitCost = Number(req.body?.unitCost), note = String(req.body?.note || '').trim()
  if (!supplierId || !productId || quantity <= 0 || unitCost <= 0) return res.status(400).json({ message: 'Thong tin phieu nhap chua hop le.' })
  try {
    const pool = await getPool()
    const tx = new sql.Transaction(pool); await tx.begin()
    try {
      const pn = await new sql.Request(tx).input('MaPhieuNhap', sql.NVarChar(30), makeCode('PN')).input('NhaCungCapID', sql.Int, supplierId).input('TongTienNhap', sql.Decimal(18, 2), quantity * unitCost).input('TrangThai', sql.NVarChar(30), STATUS.purchase.draft).input('GhiChu', sql.NVarChar(255), note || null).query("INSERT INTO dbo.PhieuNhap (MaPhieuNhap,NhaCungCapID,TongTienNhap,TrangThai,GhiChu) OUTPUT INSERTED.PhieuNhapID AS id VALUES (@MaPhieuNhap,@NhaCungCapID,@TongTienNhap,@TrangThai,@GhiChu)")
      await new sql.Request(tx).input('PhieuNhapID', sql.Int, pn.recordset[0].id).input('SanPhamID', sql.Int, productId).input('SoLuong', sql.Int, quantity).input('DonGiaNhap', sql.Decimal(18, 2), unitCost).query("INSERT INTO dbo.ChiTietPhieuNhap (PhieuNhapID,SanPhamID,SoLuong,DonGiaNhap) VALUES (@PhieuNhapID,@SanPhamID,@SoLuong,@DonGiaNhap)")
      await tx.commit()
      res.status(201).json((await listPurchaseOrders())[0])
    } catch (error) { await tx.rollback(); throw error }
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the tao phieu nhap.' }) }
})

app.post('/api/cart/add', async (req, res) => {
  const customerId = Number(req.body?.customerId), productId = Number(req.body?.productId), quantity = Number(req.body?.quantity || 1)
  if (!customerId || !productId || quantity <= 0) return res.status(400).json({ message: 'Thong tin gio hang khong hop le.' })
  try {
    const pool = await getPool()
    const product = (await pool.request().input('ProductId', sql.Int, productId).query("SELECT GiaBan,SoLuongTon,TrangThai FROM dbo.SanPham WHERE SanPhamID=@ProductId")).recordset[0]
    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham.' })
    if (Number(product.SoLuongTon) < quantity || product.TrangThai === STATUS.product.empty) return res.status(400).json({ message: 'Kho khong du hang.' })
    const existing = await pool.request().input('CustomerId', sql.Int, customerId).input('ProductId', sql.Int, productId).query(`SELECT TOP 1 GioHangID AS id, SoLuong AS qty FROM dbo.GioHang WHERE KhachHangID=@CustomerId AND SanPhamID=@ProductId AND TrangThai <> N'${STATUS.cart.converted}'`)
    if (existing.recordset.length) await pool.request().input('CartId', sql.Int, existing.recordset[0].id).input('SoLuong', sql.Int, Number(existing.recordset[0].qty) + quantity).input('TrangThai', sql.NVarChar(30), STATUS.cart.shopping).query("UPDATE dbo.GioHang SET SoLuong=@SoLuong, TrangThai=@TrangThai, UpdatedAt=SYSDATETIME() WHERE GioHangID=@CartId")
    else await pool.request().input('KhachHangID', sql.Int, customerId).input('SanPhamID', sql.Int, productId).input('SoLuong', sql.Int, quantity).input('DonGiaTaiThoiDiem', sql.Decimal(18, 2), Number(product.GiaBan)).input('TrangThai', sql.NVarChar(30), STATUS.cart.shopping).query("INSERT INTO dbo.GioHang (KhachHangID,SanPhamID,SoLuong,DonGiaTaiThoiDiem,TrangThai) VALUES (@KhachHangID,@SanPhamID,@SoLuong,@DonGiaTaiThoiDiem,@TrangThai)")
    res.status(201).json(await getCart(customerId))
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the them vao gio hang.' }) }
})

app.post('/api/cart/:customerId/action', async (req, res) => {
  const customerId = Number(req.params.customerId), action = String(req.body?.action || '')
  try {
    const cart = await getCart(customerId), next = nextStatus('cart', action, cart.status), pool = await getPool()
    if (action === 'xoaHet') { await pool.request().input('CustomerId', sql.Int, customerId).query(`DELETE FROM dbo.GioHang WHERE KhachHangID=@CustomerId AND TrangThai <> N'${STATUS.cart.converted}'`); return res.json(await getCart(customerId)) }
    await pool.request().input('CustomerId', sql.Int, customerId).input('TrangThai', sql.NVarChar(30), next).query(`UPDATE dbo.GioHang SET TrangThai=@TrangThai, UpdatedAt=SYSDATETIME() WHERE KhachHangID=@CustomerId AND TrangThai <> N'${STATUS.cart.converted}'`)
    res.json(await getCart(customerId))
  } catch (error) { res.status(error.statusCode || 500).json({ message: error instanceof Error ? error.message : 'Khong the cap nhat gio hang.' }) }
})

app.post('/api/orders/from-cart', async (req, res) => {
  const customerId = Number(req.body?.customerId), paymentMethod = String(req.body?.paymentMethod || '').trim(), address = String(req.body?.address || '').trim()
  if (!customerId || !paymentMethod || !address) return res.status(400).json({ message: 'Thieu thong tin tao don hang.' })
  try {
    const cart = await getCart(customerId); if (!cart.items.length) return res.status(400).json({ message: 'Gio hang dang trong.' }); nextStatus('cart', 'nhanDatHang', cart.status)
    const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin()
    try {
      const dh = await new sql.Request(tx).input('MaDonHang', sql.NVarChar(30), makeCode('DH')).input('KhachHangID', sql.Int, customerId).input('TongTien', sql.Decimal(18, 2), cart.totalAmount).input('PhuongThucThanhToan', sql.NVarChar(50), paymentMethod).input('DiaChiGiaoHang', sql.NVarChar(255), address).input('TrangThai', sql.NVarChar(30), STATUS.order.pending).query("INSERT INTO dbo.DonHang (MaDonHang,KhachHangID,TongTien,PhuongThucThanhToan,DiaChiGiaoHang,TrangThai) OUTPUT INSERTED.DonHangID AS id VALUES (@MaDonHang,@KhachHangID,@TongTien,@PhuongThucThanhToan,@DiaChiGiaoHang,@TrangThai)")
      for (const item of cart.items) {
        await new sql.Request(tx).input('DonHangID', sql.Int, dh.recordset[0].id).input('SanPhamID', sql.Int, item.productId).input('SoLuong', sql.Int, item.quantity).input('DonGia', sql.Decimal(18, 2), item.unitPrice).query("INSERT INTO dbo.ChiTietDonHang (DonHangID,SanPhamID,SoLuong,DonGia) VALUES (@DonHangID,@SanPhamID,@SoLuong,@DonGia)")
        await new sql.Request(tx).input('SanPhamID', sql.Int, item.productId).input('SoLuong', sql.Int, item.quantity).query(`UPDATE dbo.SanPham SET SoLuongTon = CASE WHEN SoLuongTon - @SoLuong < 0 THEN 0 ELSE SoLuongTon - @SoLuong END, TrangThai = CASE WHEN SoLuongTon - @SoLuong <= 0 THEN N'${STATUS.product.empty}' ELSE TrangThai END, UpdatedAt=SYSDATETIME() WHERE SanPhamID=@SanPhamID`)
      }
      await new sql.Request(tx).input('CustomerId', sql.Int, customerId).query(`UPDATE dbo.GioHang SET TrangThai=N'${STATUS.cart.converted}', UpdatedAt=SYSDATETIME() WHERE KhachHangID=@CustomerId AND TrangThai <> N'${STATUS.cart.converted}'`)
      await tx.commit()
      res.status(201).json({ order: (await listOrders(customerId))[0], cart: await getCart(customerId) })
    } catch (error) { await tx.rollback(); throw error }
  } catch (error) { res.status(error.statusCode || 500).json({ message: error instanceof Error ? error.message : 'Khong the tao don hang.' }) }
})

app.post('/api/repairs', async (req, res) => {
  const customerId = Number(req.body?.customerId), productId = req.body?.productId ? Number(req.body.productId) : null, issue = String(req.body?.issue || '').trim()
  if (!customerId || !issue) return res.status(400).json({ message: 'Thieu thong tin yeu cau sua chua.' })
  try {
    const pool = await getPool()
    await pool.request().input('MaPhieuSuaChua', sql.NVarChar(30), makeCode('SC')).input('KhachHangID', sql.Int, customerId).input('SanPhamID', sql.Int, productId).input('MoTaLoi', sql.NVarChar(1000), issue).input('TrangThai', sql.NVarChar(30), STATUS.repair.received).query("INSERT INTO dbo.PhieuSuaChua (MaPhieuSuaChua,KhachHangID,SanPhamID,MoTaLoi,TrangThai) VALUES (@MaPhieuSuaChua,@KhachHangID,@SanPhamID,@MoTaLoi,@TrangThai)")
    res.status(201).json((await listRepairs(customerId))[0])
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : 'Khong the tao phieu sua chua.' }) }
})

app.post('/api/workflow/:entity/:id/action', async (req, res) => {
  const entity = String(req.params.entity || ''), id = Number(req.params.id), action = String(req.body?.action || ''), quantity = Number(req.body?.quantity || 0)
  try {
    const pool = await getPool()
    if (entity === 'account') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status FROM dbo.TaiKhoan WHERE TaiKhoanID=@Id')).recordset[0]; const next = nextStatus('account', action, row.status); await pool.request().input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).query('UPDATE dbo.TaiKhoan SET TrangThai=@TrangThai WHERE TaiKhoanID=@Id'); return res.json((await listAccounts()).find(item => item.id === id)) }
    if (entity === 'supplier') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status FROM dbo.NhaCungCap WHERE NhaCungCapID=@Id')).recordset[0]; const next = nextStatus('supplier', action, row.status); await pool.request().input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).query('UPDATE dbo.NhaCungCap SET TrangThai=@TrangThai WHERE NhaCungCapID=@Id'); return res.json((await listSuppliers()).find(item => item.id === id)) }
    if (entity === 'product') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status, SoLuongTon AS stock FROM dbo.SanPham WHERE SanPhamID=@Id')).recordset[0]; const next = nextStatus('product', action, row.status); const stock = action === 'banHet' ? 0 : ((action === 'nhapLanDau' || action === 'nhapThem') && quantity > 0 ? Number(row.stock) + quantity : Number(row.stock)); await pool.request().input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).input('SoLuongTon', sql.Int, stock).query('UPDATE dbo.SanPham SET TrangThai=@TrangThai, SoLuongTon=@SoLuongTon, UpdatedAt=SYSDATETIME() WHERE SanPhamID=@Id'); return res.json((await listProducts(true)).find(item => item.id === id)) }
    if (entity === 'purchase') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status FROM dbo.PhieuNhap WHERE PhieuNhapID=@Id')).recordset[0]; const next = nextStatus('purchase', action, row.status); const tx = new sql.Transaction(pool); await tx.begin(); try { await new sql.Request(tx).input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).query('UPDATE dbo.PhieuNhap SET TrangThai=@TrangThai WHERE PhieuNhapID=@Id'); if (action === 'nhapKho') { const items = (await new sql.Request(tx).input('Id', sql.Int, id).query('SELECT SanPhamID,SoLuong FROM dbo.ChiTietPhieuNhap WHERE PhieuNhapID=@Id')).recordset; for (const item of items) await new sql.Request(tx).input('SanPhamID', sql.Int, item.SanPhamID).input('SoLuong', sql.Int, Number(item.SoLuong)).query(`UPDATE dbo.SanPham SET SoLuongTon = SoLuongTon + @SoLuong, TrangThai = CASE WHEN TrangThai IN (N'${STATUS.product.fresh}',N'${STATUS.product.empty}',N'${STATUS.product.stopped}') THEN N'${STATUS.product.selling}' ELSE TrangThai END, UpdatedAt=SYSDATETIME() WHERE SanPhamID=@SanPhamID`) } await tx.commit() } catch (error) { await tx.rollback(); throw error } return res.json((await listPurchaseOrders()).find(item => item.id === id)) }
    if (entity === 'order') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status FROM dbo.DonHang WHERE DonHangID=@Id')).recordset[0]; const next = nextStatus('order', action, row.status); await pool.request().input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).query(`UPDATE dbo.DonHang SET TrangThai=@TrangThai, NgayThanhToan = CASE WHEN @TrangThai = N'${STATUS.order.processing}' THEN SYSDATETIME() ELSE NgayThanhToan END WHERE DonHangID=@Id`); return res.json((await listOrders()).find(item => item.id === id)) }
    if (entity === 'repair') { const row = (await pool.request().input('Id', sql.Int, id).query('SELECT TrangThai AS status FROM dbo.PhieuSuaChua WHERE PhieuSuaChuaID=@Id')).recordset[0]; const next = nextStatus('repair', action, row.status); await pool.request().input('Id', sql.Int, id).input('TrangThai', sql.NVarChar(30), next).query(`UPDATE dbo.PhieuSuaChua SET TrangThai=@TrangThai, NgayHoanTat = CASE WHEN @TrangThai IN (N'${STATUS.repair.ready}',N'${STATUS.repair.returned}') THEN SYSDATETIME() ELSE NgayHoanTat END WHERE PhieuSuaChuaID=@Id`); return res.json((await listRepairs()).find(item => item.id === id)) }
    res.status(400).json({ message: 'Entity workflow khong hop le.' })
  } catch (error) { res.status(error.statusCode || 500).json({ message: error instanceof Error ? error.message : 'Khong the cap nhat trang thai.' }) }
})

const boot = async () => {
  try {
    await ensureSchema()
    app.listen(port, () => console.log(`SQL Server workflow API running at http://localhost:${port}`))
  } catch (error) {
    console.error('Boot error:', error)
    process.exit(1)
  }
}

void boot()
