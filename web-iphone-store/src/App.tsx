import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'

type Product = {
  id: number
  code: string
  brand: string
  model: string
  category: string
  imageUrl: string | null
  price: number
  originalPrice: number
  stock: number
  color: string | null
  storage: string | null
  description: string | null
  rating: number
  reviews: number
  badge: string
  installment: string
  status?: string
  actions?: WorkflowAction[]
}

type UserRole = 'admin' | 'customer'

type UserAccount = {
  id: number
  fullName: string
  username?: string
  email: string
  role: UserRole
  phone?: string
  address?: string
  customerCode?: string
  customerId?: number | null
  status?: string
}

type AuthMode = 'login' | 'register'

type ApiProduct = {
  id: number
  code: string
  model: string
  category: string
  imageUrl: string | null
  price: number
  originalPrice: number
  stock: number
  color: string | null
  storage: string | null
  description: string | null
  status: string
  actions?: WorkflowAction[]
}

type AdminStats = {
  customerCount: number
  productCount: number
  inventoryValue: number
}

type WorkflowAction = {
  key: string
  nextStatus: string
}

type WorkflowAccount = UserAccount & {
  status?: string
  customerId?: number | null
  actions?: WorkflowAction[]
}

type WorkflowSupplier = {
  id: number
  code: string
  name: string
  phone?: string
  email?: string
  address?: string
  status: string
  actions: WorkflowAction[]
}

type WorkflowPurchaseOrder = {
  id: number
  code: string
  supplierName: string
  totalAmount: number
  status: string
  note?: string
  actions: WorkflowAction[]
}

type WorkflowOrder = {
  id: number
  code: string
  customerName: string
  totalAmount: number
  paymentMethod?: string
  shippingAddress?: string
  status: string
  itemSummary: string
  actions: WorkflowAction[]
}

type WorkflowRepair = {
  id: number
  code: string
  customerName: string
  productName: string
  issue: string
  status: string
  estimatedCost: number
  finalCost: number
  actions: WorkflowAction[]
}

type CartItem = {
  id: number
  productId: number
  model: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  stock: number
  status: string
}

type CustomerCart = {
  customerId: number
  status: string
  totalAmount: number
  items: CartItem[]
  actions: WorkflowAction[]
}

type DashboardPayload = {
  stats: AdminStats
  accounts: WorkflowAccount[]
  suppliers: WorkflowSupplier[]
  products: ApiProduct[]
  purchaseOrders: WorkflowPurchaseOrder[]
  orders: WorkflowOrder[]
  repairs: WorkflowRepair[]
  customerCart?: CustomerCart
  customerOrders?: WorkflowOrder[]
  customerRepairs?: WorkflowRepair[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

const fallbackProducts: Product[] = [
  {
    id: 1,
    code: 'SP0001',
    brand: 'Apple',
    model: 'iPhone 17 Pro 256GB Chính Hãng',
    category: 'Điện thoại',
    imageUrl: '/images/products/iphone17pro.jpg',
    price: 33690000,
    originalPrice: 34990000,
    stock: 15,
    color: 'Titan Tự Nhiên',
    storage: '256GB',
    description: 'Dữ liệu mẫu hiển thị khi API chưa kết nối.',
    rating: 4.9,
    reviews: 12,
    badge: 'Bảo hành 1 đổi 1 12 tháng',
    installment: 'Trả góp 0% trả trước 0đ'
  }
]

const brands = ['Tất cả', 'Apple', 'Samsung', 'Xiaomi']
const quickFilters = ['Giá Cao - Thấp', 'Giá Thấp - Cao', 'Xem Nhiều']
const serviceLinks = ['Gọi mua hàng 1900.633.471', 'Chính sách Bảo hành', 'Hệ thống Cửa hàng']

function formatVND(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`
}

function inferBrand(model: string) {
  const normalized = model.toLowerCase()
  if (normalized.includes('iphone') || normalized.includes('apple')) return 'Apple'
  if (normalized.includes('samsung') || normalized.includes('galaxy')) return 'Samsung'
  if (normalized.includes('xiaomi')) return 'Xiaomi'
  return 'Khác'
}

function normalizeProductDescription(description: string | null) {
  if (!description) return null

  const normalized = description.trim().toLowerCase()
  if (normalized.startsWith('san pham tao tu file anh')) {
    return null
  }

  return description
}

function mapApiProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    code: product.code,
    brand: inferBrand(product.model),
    model: product.model,
    category: product.category,
    imageUrl: product.imageUrl,
    price: product.price,
    originalPrice: product.originalPrice > 0 ? product.originalPrice : product.price,
    stock: product.stock,
    color: product.color,
    storage: product.storage,
    description: normalizeProductDescription(product.description),
    rating: 4.8,
    reviews: 0,
    badge: 'Bảo hành 1 đổi 1 12 tháng',
    installment: 'Trả góp linh hoạt'
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text()

  if (!rawText) {
    return {} as T
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    if (rawText.includes('Cannot POST /api/register')) {
      throw new Error('REGISTER_ROUTE_MISSING')
    }

    if (rawText.includes('Cannot POST /api/login')) {
      throw new Error('LOGIN_ROUTE_MISSING')
    }

    throw new Error('INVALID_API_RESPONSE')
  }
}

function getFriendlyAuthError(message: string, mode: AuthMode) {
  if (message === 'REGISTER_ROUTE_MISSING' || message === 'INVALID_API_RESPONSE') {
    return mode === 'register' ? 'Đăng ký không thành công.' : 'Đăng nhập không thành công.'
  }

  if (message === 'LOGIN_ROUTE_MISSING') {
    return 'Đăng nhập không thành công.'
  }

  return message
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const payload = await readJsonResponse<T & { message?: string }>(response)
  if (!response.ok) {
    throw new Error(payload.message || 'Yêu cầu không thành công.')
  }

  return payload
}

function App() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showAccountDetails, setShowAccountDetails] = useState(false)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('Tất cả')
  const [sortMode, setSortMode] = useState('Giá Cao - Thấp')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [adminSubmitError, setAdminSubmitError] = useState('')
  const [adminSubmitMessage, setAdminSubmitMessage] = useState('')
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [workflowMessage, setWorkflowMessage] = useState('')
  const [workflowError, setWorkflowError] = useState('')
  const [adminStats, setAdminStats] = useState<AdminStats>({
    customerCount: 0,
    productCount: 0,
    inventoryValue: 0
  })
  const [accounts, setAccounts] = useState<WorkflowAccount[]>([])
  const [suppliers, setSuppliers] = useState<WorkflowSupplier[]>([])
  const [adminProducts, setAdminProducts] = useState<ApiProduct[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<WorkflowPurchaseOrder[]>([])
  const [orders, setOrders] = useState<WorkflowOrder[]>([])
  const [repairs, setRepairs] = useState<WorkflowRepair[]>([])
  const [customerCart, setCustomerCart] = useState<CustomerCart | null>(null)
  const [customerOrders, setCustomerOrders] = useState<WorkflowOrder[]>([])
  const [customerRepairs, setCustomerRepairs] = useState<WorkflowRepair[]>([])
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [adminDraft, setAdminDraft] = useState({
    model: '',
    brand: 'Apple',
    category: 'Điện thoại',
    imageUrl: '',
    price: '',
    originalPrice: '',
    stock: '',
    color: '',
    storage: '',
    description: ''
  })
  const [purchaseDraft, setPurchaseDraft] = useState({
    supplierId: '',
    productId: '',
    quantity: '5',
    unitCost: '',
    note: ''
  })
  const [repairDraft, setRepairDraft] = useState({
    productId: '',
    issue: ''
  })
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  async function loadProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const apiProducts = await readJsonResponse<ApiProduct[]>(response)
      setProducts(apiProducts.length ? apiProducts.map(mapApiProduct) : fallbackProducts)
    } catch {
      setProducts(fallbackProducts)
    }
  }

  async function loadAdminStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`)
      if (!response.ok) return
      const stats = await readJsonResponse<AdminStats>(response)
      setAdminStats(stats)
    } catch {
      setAdminStats({
        customerCount: 0,
        productCount: products.length,
        inventoryValue: products.reduce((sum, product) => sum + product.price * product.stock, 0)
      })
    }
  }

  async function loadDashboard(user?: UserAccount | null) {
    const activeUser = user ?? currentUser
    const customerId = activeUser?.customerId ? `?customerId=${activeUser.customerId}` : ''

    try {
      setIsLoadingDashboard(true)
      const response = await fetch(`${API_BASE_URL}/api/dashboard${customerId}`)
      if (!response.ok) return
      const payload = await readJsonResponse<DashboardPayload>(response)

      setAdminStats(payload.stats)
      setAccounts(payload.accounts ?? [])
      setSuppliers(payload.suppliers ?? [])
      setAdminProducts(payload.products ?? [])
      setPurchaseOrders(payload.purchaseOrders ?? [])
      setOrders(payload.orders ?? [])
      setRepairs(payload.repairs ?? [])
      setCustomerCart(payload.customerCart ?? null)
      setCustomerOrders(payload.customerOrders ?? [])
      setCustomerRepairs(payload.customerRepairs ?? [])

      if (payload.products?.length) {
        setProducts(payload.products.map(mapApiProduct))
      }
    } catch {
      setWorkflowError('Không thể tải dữ liệu workflow.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  useEffect(() => {
    if (currentUser) {
      void loadDashboard(currentUser)
    } else {
      void loadAdminStats()
    }
  }, [currentUser])

  useEffect(() => {
    if (!showAccountMenu) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setShowAccountMenu(false)
        setShowAccountDetails(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAccountMenu(false)
        setShowAccountDetails(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showAccountMenu])

  const filteredProducts = useMemo(() => {
    const items = products.filter(product => {
      const textMatch = product.model.toLowerCase().includes(search.toLowerCase())
      const brandMatch = brandFilter === 'Tất cả' || product.brand === brandFilter
      return textMatch && brandMatch
    })

    if (sortMode === 'Giá Cao - Thấp') {
      return [...items].sort((a, b) => b.price - a.price)
    }

    if (sortMode === 'Giá Thấp - Cao') {
      return [...items].sort((a, b) => a.price - b.price)
    }

    return [...items].sort((a, b) => b.stock - a.stock)
  }, [brandFilter, products, search, sortMode])

  const topProduct = useMemo(() => {
    return [...products].sort((a, b) => b.stock - a.stock)[0]?.model ?? 'Chưa có dữ liệu'
  }, [products])

  const displayAccountName =
    currentUser?.fullName?.trim() ||
    currentUser?.username?.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Tài khoản'

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthError('')
    setAuthMessage('')
    setShowAccountMenu(false)
    setShowAccountDetails(false)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => {
    setShowAuthModal(false)
    setAuthError('')
    setAuthMessage('')
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (!loginForm.identifier.trim() || !loginForm.password.trim()) {
      setAuthError('Vui lòng nhập tên đăng nhập hoặc email và mật khẩu.')
      return
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identifier: loginForm.identifier.trim(),
            password: loginForm.password
          })
        })

        const payload = await readJsonResponse<{
          message?: string
          account?: UserAccount
        }>(response)

        if (!response.ok || !payload.account) {
          throw new Error(payload.message || 'Đăng nhập thất bại.')
        }

        setCurrentUser(payload.account)
        await loadDashboard(payload.account)
        setLoginForm({ identifier: '', password: '' })
        setAuthMessage(payload.account.role === 'admin' ? 'Đăng nhập admin thành công.' : 'Đăng nhập thành công.')
        setTimeout(() => {
          setShowAuthModal(false)
          setAuthMessage('')
        }, 700)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Đăng nhập không thành công.'
        setAuthError(getFriendlyAuthError(message, 'login'))
      }
    })()
  }

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    const normalizedEmail = registerForm.email.trim().toLowerCase()

    if (
      !registerForm.fullName.trim() ||
      !registerForm.username.trim() ||
      !registerForm.phone.trim() ||
      !registerForm.address.trim() ||
      !normalizedEmail ||
      !registerForm.password
    ) {
      setAuthError('Vui lòng nhập đầy đủ thông tin khách hàng.')
      return
    }

    if (registerForm.password.length < 6) {
      setAuthError('Mật khẩu cần từ 6 ký tự trở lên.')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Mật khẩu nhập lại chưa khớp.')
      return
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: registerForm.username.trim(),
            fullName: registerForm.fullName.trim(),
            phone: registerForm.phone.trim(),
            address: registerForm.address.trim(),
            email: normalizedEmail,
            password: registerForm.password
          })
        })

        const payload = await readJsonResponse<{
          message?: string
        }>(response)

        if (!response.ok) {
          throw new Error(payload.message || 'Đăng ký thất bại.')
        }

        setRegisterForm({
          fullName: '',
          username: '',
          phone: '',
          address: '',
          email: '',
          password: '',
          confirmPassword: ''
        })
        setLoginForm({
          identifier: registerForm.username.trim(),
          password: ''
        })
        setAuthMode('login')
        setAuthMessage('Đăng ký thành công. Mời bạn đăng nhập.')
        if (currentUser?.role === 'admin') {
          await loadAdminStats()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Đăng ký không thành công.'
        setAuthError(getFriendlyAuthError(message, 'register'))
      }
    })()
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setShowAccountMenu(false)
    setShowAccountDetails(false)
    setAuthMessage('')
    setAuthError('')
    setWorkflowMessage('')
    setWorkflowError('')
    setCustomerCart(null)
    setCustomerOrders([])
    setCustomerRepairs([])
  }

  const handleAdminAddProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminSubmitError('')
    setAdminSubmitMessage('')

    if (!adminDraft.model.trim() || !adminDraft.price) {
      setAdminSubmitError('Vui lòng nhập tên sản phẩm và giá bán.')
      return
    }

    setIsSavingProduct(true)

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: adminDraft.model,
            category: adminDraft.category,
            imageUrl: adminDraft.imageUrl,
            price: Number(adminDraft.price),
            originalPrice: Number(adminDraft.originalPrice || adminDraft.price),
            stock: Number(adminDraft.stock || 0),
            color: adminDraft.color,
            storage: adminDraft.storage,
            description: adminDraft.description
          })
        })

        const payload = await readJsonResponse<{ message?: string }>(response)

        if (!response.ok) {
          throw new Error(payload.message || 'Không thể thêm sản phẩm.')
        }

        setAdminSubmitMessage('Đã lưu sản phẩm vào SQL Server thành công.')
        setAdminDraft({
          model: '',
          brand: 'Apple',
          category: 'Điện thoại',
          imageUrl: '',
          price: '',
          originalPrice: '',
          stock: '',
          color: '',
          storage: '',
          description: ''
        })
        await loadDashboard(currentUser)
        await loadProducts()
      } catch (error) {
        setAdminSubmitError(error instanceof Error ? error.message : 'Thêm sản phẩm thất bại.')
      } finally {
        setIsSavingProduct(false)
      }
    })()
  }

  const handleWorkflowAction = (entity: string, id: number, action: string, quantity?: number) => {
    setWorkflowError('')
    setWorkflowMessage('')

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/workflow/${entity}/${id}/action`, { action, quantity })
        setWorkflowMessage('Đã cập nhật trạng thái.')
        await loadDashboard(currentUser)
        await loadProducts()
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Cập nhật trạng thái thất bại.')
      }
    })()
  }

  const handleAddToCart = (productId: number) => {
    if (!currentUser?.customerId) {
      openAuthModal('login')
      return
    }

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/cart/add`, {
          customerId: currentUser.customerId,
          productId,
          quantity: 1
        })
        setWorkflowMessage('Đã thêm vào giỏ hàng.')
        await loadDashboard(currentUser)
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.')
      }
    })()
  }

  const handleCartAction = (action: string) => {
    if (!currentUser?.customerId) return

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/cart/${currentUser.customerId}/action`, { action })
        await loadDashboard(currentUser)
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Không thể cập nhật giỏ hàng.')
      }
    })()
  }

  const handleCreateOrder = () => {
    if (!currentUser?.customerId) return

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/orders/from-cart`, {
          customerId: currentUser.customerId,
          paymentMethod: 'COD',
          address: currentUser.address || 'Cập nhật sau'
        })
        setWorkflowMessage('Đã tạo đơn hàng từ giỏ.')
        await loadDashboard(currentUser)
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Không thể tạo đơn hàng.')
      }
    })()
  }

  const handleCreatePurchaseOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/purchase-orders`, {
          supplierId: Number(purchaseDraft.supplierId),
          productId: Number(purchaseDraft.productId),
          quantity: Number(purchaseDraft.quantity),
          unitCost: Number(purchaseDraft.unitCost || 0),
          note: purchaseDraft.note
        })
        setPurchaseDraft({
          supplierId: '',
          productId: '',
          quantity: '5',
          unitCost: '',
          note: ''
        })
        setWorkflowMessage('Đã tạo phiếu nhập.')
        await loadDashboard(currentUser)
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Không thể tạo phiếu nhập.')
      }
    })()
  }

  const handleCreateRepair = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUser?.customerId) return

    void (async () => {
      try {
        await postJson(`${API_BASE_URL}/api/repairs`, {
          customerId: currentUser.customerId,
          productId: repairDraft.productId ? Number(repairDraft.productId) : null,
          issue: repairDraft.issue
        })
        setRepairDraft({ productId: '', issue: '' })
        setWorkflowMessage('Đã gửi yêu cầu sửa chữa.')
        await loadDashboard(currentUser)
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu sửa chữa.')
      }
    })()
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand-lockup">
            <div className="brand-mark">AM</div>
            <div>
              <strong>APPLE MEO MEO</strong>
              <span>Apple Authorised Reseller</span>
            </div>
          </div>

          <label className="searchbox" aria-label="Tìm kiếm sản phẩm">
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Bạn cần tìm gì..."
            />
            <span>Tìm</span>
          </label>

          <div className="region-pill">Xem giá tại Miền Bắc</div>

          <nav className="service-nav" aria-label="Dịch vụ">
            {serviceLinks.map(link => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </nav>

          <div className="account-actions">
            {currentUser ? (
              <div className="account-menu" ref={accountMenuRef}>
                <button
                  type="button"
                  className="account-trigger"
                  onClick={() => setShowAccountMenu(previous => !previous)}
                  aria-haspopup="menu"
                  aria-expanded={showAccountMenu}
                >
                  <span className="account-trigger-name">{displayAccountName}</span>
                  <span className="hamburger-button" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </button>

                {showAccountMenu ? (
                  <div className="account-dropdown" role="menu" aria-label="Menu tài khoản">
                    <button
                      type="button"
                      className="account-dropdown-item"
                      onClick={() => setShowAccountDetails(previous => !previous)}
                    >
                      Thông tin tài khoản
                    </button>

                    {showAccountDetails ? (
                      <div className="account-dropdown-panel">
                        <strong>{displayAccountName}</strong>
                        <span>{currentUser.email}</span>
                        <small>{currentUser.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</small>
                      </div>
                    ) : null}

                    <button type="button" className="account-dropdown-item danger" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <button type="button" className="account-button secondary" onClick={() => openAuthModal('login')}>
                  Đăng nhập
                </button>
                <button type="button" className="account-button" onClick={() => openAuthModal('register')}>
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {currentUser?.role === 'admin' ? (
        <section className="admin-panel">
          <div className="container admin-layout">
            <div className="admin-header">
              <div>
                <p className="admin-label">Khu vực quản trị</p>
                <h2>Xin chào admin, đây là bảng điều khiển của bạn</h2>
                <p>
                  Dữ liệu đăng nhập và đăng ký hiện đã đọc thật từ bảng <strong>TaiKhoan</strong> và{' '}
                  <strong>KhachHang</strong>.
                </p>
              </div>
            </div>

            <div className="admin-stats">
              <article>
                <span>Tổng sản phẩm</span>
                <strong>{adminStats.productCount}</strong>
              </article>
              <article>
                <span>Tài khoản khách</span>
                <strong>{adminStats.customerCount}</strong>
              </article>
              <article>
                <span>Giá trị kho</span>
                <strong>{formatVND(adminStats.inventoryValue)}</strong>
              </article>
              <article>
                <span>Tồn nhiều nhất</span>
                <strong>{topProduct}</strong>
              </article>
            </div>

            <div className="admin-tools">
              <form className="admin-card" onSubmit={handleAdminAddProduct}>
                <h3>Thêm sản phẩm trực tiếp vào SQL Server</h3>
                <div className="admin-form-grid">
                  <input
                    value={adminDraft.model}
                    onChange={event => setAdminDraft(current => ({ ...current, model: event.target.value }))}
                    placeholder="Tên sản phẩm"
                  />
                  <select
                    value={adminDraft.brand}
                    onChange={event => setAdminDraft(current => ({ ...current, brand: event.target.value }))}
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi</option>
                  </select>
                  <input
                    value={adminDraft.imageUrl}
                    onChange={event => setAdminDraft(current => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="/images/products/ten-anh.jpg"
                  />
                  <input
                    value={adminDraft.category}
                    onChange={event => setAdminDraft(current => ({ ...current, category: event.target.value }))}
                    placeholder="Loại sản phẩm"
                  />
                  <input
                    value={adminDraft.price}
                    onChange={event => setAdminDraft(current => ({ ...current, price: event.target.value }))}
                    placeholder="Giá bán"
                    type="number"
                  />
                  <input
                    value={adminDraft.originalPrice}
                    onChange={event =>
                      setAdminDraft(current => ({ ...current, originalPrice: event.target.value }))
                    }
                    placeholder="Giá niêm yết"
                    type="number"
                  />
                  <input
                    value={adminDraft.stock}
                    onChange={event => setAdminDraft(current => ({ ...current, stock: event.target.value }))}
                    placeholder="Số lượng tồn"
                    type="number"
                  />
                  <input
                    value={adminDraft.storage}
                    onChange={event => setAdminDraft(current => ({ ...current, storage: event.target.value }))}
                    placeholder="Dung lượng"
                  />
                  <input
                    value={adminDraft.color}
                    onChange={event => setAdminDraft(current => ({ ...current, color: event.target.value }))}
                    placeholder="Màu sắc"
                  />
                  <input
                    value={adminDraft.description}
                    onChange={event => setAdminDraft(current => ({ ...current, description: event.target.value }))}
                    placeholder="Mô tả ngắn"
                  />
                </div>
                {adminSubmitError ? <div className="auth-error">{adminSubmitError}</div> : null}
                {adminSubmitMessage ? <div className="auth-success">{adminSubmitMessage}</div> : null}
                <button type="submit" className="account-button admin-submit" disabled={isSavingProduct}>
                  {isSavingProduct ? 'Đang lưu...' : 'Lưu vào SQL Server'}
                </button>
              </form>

              <div className="admin-card">
                <h3>Sản phẩm đang hiển thị từ DB</h3>
                <div className="admin-list">
                  {products.slice(0, 6).map(product => (
                    <div className="admin-list-item" key={product.id}>
                      <div>
                        <strong>{product.model}</strong>
                        <span>{product.code} - {product.imageUrl ?? 'Chưa có ảnh'}</span>
                      </div>
                      <button type="button" onClick={() => void loadProducts()}>
                        Tải lại
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="hero-strip">
        <div className="container hero-grid">
          <aside className="hero-banner hero-banner-left">
            <p className="eyebrow">Apple</p>
            <h1>Kho dữ liệu từ SQL Server</h1>
            <p className="subcopy">Sản phẩm, hình ảnh và thông số sẽ được load từ DB qua API.</p>
            <div className="mini-specs">
              <span>API sản phẩm</span>
              <span>SQL Server</span>
              <span>Frontend React</span>
            </div>
          </aside>

          <div className="hero-center">
            <div className="filter-panel">
              <div className="filter-header">
                <h2>Sắp xếp theo</h2>
                <div className="brand-chips">
                  {brands.map(brand => (
                    <button
                      type="button"
                      key={brand}
                      className={brandFilter === brand ? 'chip active' : 'chip'}
                      onClick={() => setBrandFilter(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-filters">
                {quickFilters.map(filter => (
                  <button
                    type="button"
                    key={filter}
                    className={sortMode === filter ? 'chip active' : 'chip'}
                    onClick={() => setSortMode(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="product-grid">
                {filteredProducts.map(product => (
                  <article className="product-card" key={product.id}>
                    <div className="installment-tag">{product.installment}</div>
                    <div className="device-stage image-stage">
                      {product.imageUrl ? (
                        <img className="product-image" src={product.imageUrl} alt={product.model} />
                      ) : (
                        <div className="image-fallback">Không có ảnh</div>
                      )}
                    </div>

                    <div className="warranty-badge">{product.badge}</div>

                    <div className="card-body">
                      <h3>{product.model}</h3>
                      <div className="price-row">
                        <strong>{formatVND(product.price)}</strong>
                        <s>{formatVND(product.originalPrice)}</s>
                      </div>

                      <div className="spec-list">
                        <p>
                          <strong>Dung lượng:</strong> {product.storage ?? 'Đang cập nhật'}
                        </p>
                        <p>
                          <strong>Màu sắc:</strong> {product.color ?? 'Đang cập nhật'}
                        </p>
                        <p>
                          <strong>Tồn kho:</strong> {product.stock}
                        </p>
                      </div>

                      <div className="perk-box">
                        <p>{product.description ?? 'Sản phẩm đang được đồng bộ mô tả từ hệ thống.'}</p>
                      </div>

                      <button type="button" className="cta-button" onClick={() => handleAddToCart(product.id)}>
                        {currentUser?.customerId ? 'Thêm vào giỏ' : 'Mua ngay'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="hero-banner hero-banner-right">
            <div className="promo-frame">
              <div className="promo-screen" />
            </div>
            <strong>Hình ảnh sản phẩm</strong>
            <span>Lấy từ folder public</span>
          </aside>
        </div>
      </section>

      {(workflowError || workflowMessage || isLoadingDashboard) && currentUser ? (
        <section className="workflow-banner container">
          {isLoadingDashboard ? <div className="auth-note">Đang tải dữ liệu trạng thái...</div> : null}
          {workflowError ? <div className="auth-error">{workflowError}</div> : null}
          {workflowMessage ? <div className="auth-success">{workflowMessage}</div> : null}
        </section>
      ) : null}

      {currentUser?.role === 'customer' ? (
        <section className="workflow-section">
          <div className="container workflow-layout">
            <article className="workflow-card">
              <h3>Giỏ hàng theo trạng thái</h3>
              <p>Trạng thái hiện tại: <strong>{customerCart?.status ?? 'Trong'}</strong></p>
              <div className="workflow-list">
                {customerCart?.items.length ? customerCart.items.map(item => (
                  <div className="workflow-item" key={item.id}>
                    <div>
                      <strong>{item.model}</strong>
                      <span>{item.quantity} x {formatVND(item.unitPrice)}</span>
                    </div>
                    <span>{item.status}</span>
                  </div>
                )) : <div className="workflow-item"><span>Chưa có sản phẩm trong giỏ.</span></div>}
              </div>
              <div className="workflow-actions">
                {customerCart?.actions.map(action => (
                  <button key={action.key} type="button" className="chip" onClick={() => handleCartAction(action.key)}>
                    {action.key}
                  </button>
                ))}
                {customerCart?.items.length ? (
                  <button type="button" className="account-button admin-submit" onClick={handleCreateOrder}>
                    Tạo đơn hàng
                  </button>
                ) : null}
              </div>
            </article>

            <article className="workflow-card">
              <h3>Đơn hàng</h3>
              <div className="workflow-list">
                {customerOrders.length ? customerOrders.map(order => (
                  <div className="workflow-item" key={order.id}>
                    <div>
                      <strong>{order.code}</strong>
                      <span>{order.itemSummary || 'Đơn hàng từ giỏ'}</span>
                    </div>
                    <div className="workflow-item-actions">
                      <span>{order.status}</span>
                      {order.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('order', order.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                )) : <div className="workflow-item"><span>Chưa có đơn hàng.</span></div>}
              </div>
            </article>

            <article className="workflow-card">
              <h3>Yêu cầu sửa chữa</h3>
              <form className="workflow-form" onSubmit={handleCreateRepair}>
                <select value={repairDraft.productId} onChange={event => setRepairDraft(current => ({ ...current, productId: event.target.value }))}>
                  <option value="">Chọn sản phẩm</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.model}</option>
                  ))}
                </select>
                <textarea value={repairDraft.issue} onChange={event => setRepairDraft(current => ({ ...current, issue: event.target.value }))} placeholder="Mô tả lỗi sản phẩm" />
                <button type="submit" className="account-button admin-submit">Gửi yêu cầu sửa chữa</button>
              </form>
              <div className="workflow-list">
                {customerRepairs.length ? customerRepairs.map(repair => (
                  <div className="workflow-item" key={repair.id}>
                    <div>
                      <strong>{repair.code}</strong>
                      <span>{repair.productName}</span>
                    </div>
                    <div className="workflow-item-actions">
                      <span>{repair.status}</span>
                      {repair.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('repair', repair.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                )) : null}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {currentUser?.role === 'admin' ? (
        <section className="workflow-section">
          <div className="container workflow-layout">
            <article className="workflow-card">
              <h3>Tài khoản</h3>
              <div className="workflow-list">
                {accounts.map(account => (
                  <div className="workflow-item" key={account.id}>
                    <div>
                      <strong>{account.fullName}</strong>
                      <span>{account.username} • {account.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {account.actions?.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('account', account.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="workflow-card">
              <h3>Nhà cung cấp</h3>
              <div className="workflow-list">
                {suppliers.map(supplier => (
                  <div className="workflow-item" key={supplier.id}>
                    <div>
                      <strong>{supplier.name}</strong>
                      <span>{supplier.code} • {supplier.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {supplier.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('supplier', supplier.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="workflow-card">
              <h3>Tạo phiếu nhập</h3>
              <form className="workflow-form" onSubmit={handleCreatePurchaseOrder}>
                <select value={purchaseDraft.supplierId} onChange={event => setPurchaseDraft(current => ({ ...current, supplierId: event.target.value }))}>
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                <select value={purchaseDraft.productId} onChange={event => setPurchaseDraft(current => ({ ...current, productId: event.target.value, unitCost: String(products.find(product => product.id === Number(event.target.value))?.originalPrice ?? '') }))}>
                  <option value="">Chọn sản phẩm</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.model}</option>
                  ))}
                </select>
                <input type="number" value={purchaseDraft.quantity} onChange={event => setPurchaseDraft(current => ({ ...current, quantity: event.target.value }))} placeholder="Số lượng" />
                <input type="number" value={purchaseDraft.unitCost} onChange={event => setPurchaseDraft(current => ({ ...current, unitCost: event.target.value }))} placeholder="Đơn giá nhập" />
                <input value={purchaseDraft.note} onChange={event => setPurchaseDraft(current => ({ ...current, note: event.target.value }))} placeholder="Ghi chú" />
                <button type="submit" className="account-button admin-submit">Tạo phiếu nhập</button>
              </form>
            </article>

            <article className="workflow-card workflow-card-wide">
              <h3>Workflow sản phẩm</h3>
              <div className="workflow-list">
                {adminProducts.slice(0, 8).map(product => (
                  <div className="workflow-item" key={product.id}>
                    <div>
                      <strong>{product.model}</strong>
                      <span>{product.stock} máy • {product.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {(product.actions ?? []).map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('product', product.id, action.key, action.key.includes('nhap') ? 5 : undefined)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="workflow-card workflow-card-wide">
              <h3>Phiếu nhập và đơn hàng</h3>
              <div className="workflow-list">
                {purchaseOrders.map(item => (
                  <div className="workflow-item" key={`purchase-${item.id}`}>
                    <div>
                      <strong>{item.code}</strong>
                      <span>{item.supplierName} • {item.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {item.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('purchase', item.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {orders.map(order => (
                  <div className="workflow-item" key={`order-${order.id}`}>
                    <div>
                      <strong>{order.code}</strong>
                      <span>{order.customerName} • {order.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {order.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('order', order.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="workflow-card workflow-card-wide">
              <h3>Phiếu sửa chữa</h3>
              <div className="workflow-list">
                {repairs.map(repair => (
                  <div className="workflow-item" key={repair.id}>
                    <div>
                      <strong>{repair.code}</strong>
                      <span>{repair.productName} • {repair.status}</span>
                    </div>
                    <div className="workflow-item-actions">
                      {repair.actions.map(action => (
                        <button key={action.key} type="button" className="mini-action" onClick={() => handleWorkflowAction('repair', repair.id, action.key)}>
                          {action.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {showAuthModal ? (
        <div className="auth-overlay" onClick={closeAuthModal}>
          <div className="auth-modal" onClick={event => event.stopPropagation()}>
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setAuthMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setAuthMode('register')}
              >
                Đăng ký
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h3>Đăng nhập tài khoản</h3>
                <p>Đăng nhập bằng tên đăng nhập hoặc email đã lưu trong bảng TaiKhoan.</p>
                <input
                  value={loginForm.identifier}
                  onChange={event => setLoginForm(current => ({ ...current, identifier: event.target.value }))}
                  placeholder="Tên đăng nhập hoặc Email"
                />
                <input
                  value={loginForm.password}
                  onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))}
                  placeholder="Mật khẩu"
                  type="password"
                />
                <div className="auth-note">
                  Admin demo: <strong>admin@meomeo.vn</strong> / <strong>admin123</strong>
                </div>
                {authError ? <div className="auth-error">{authError}</div> : null}
                {authMessage ? <div className="auth-success">{authMessage}</div> : null}
                <button type="submit" className="account-button auth-submit">
                  Đăng nhập
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <h3>Tạo tài khoản mới</h3>
                <div className="auth-form-grid">
                  <input
                    value={registerForm.fullName}
                    onChange={event => setRegisterForm(current => ({ ...current, fullName: event.target.value }))}
                    placeholder="Họ và tên"
                  />
                  <input
                    value={registerForm.username}
                    onChange={event => setRegisterForm(current => ({ ...current, username: event.target.value }))}
                    placeholder="Tên đăng nhập"
                  />
                  <input
                    value={registerForm.phone}
                    onChange={event => setRegisterForm(current => ({ ...current, phone: event.target.value }))}
                    placeholder="Số điện thoại"
                    className="auth-field-wide"
                  />
                  <input
                    value={registerForm.email}
                    onChange={event => setRegisterForm(current => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    type="email"
                    className="auth-field-wide"
                  />
                  <input
                    value={registerForm.address}
                    onChange={event => setRegisterForm(current => ({ ...current, address: event.target.value }))}
                    placeholder="Địa chỉ"
                    className="auth-field-wide"
                  />
                  <input
                    value={registerForm.password}
                    onChange={event => setRegisterForm(current => ({ ...current, password: event.target.value }))}
                    placeholder="Mật khẩu"
                    type="password"
                  />
                  <input
                    value={registerForm.confirmPassword}
                    onChange={event =>
                      setRegisterForm(current => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Nhập lại mật khẩu"
                    type="password"
                  />
                </div>
                {authError ? <div className="auth-error">{authError}</div> : null}
                {authMessage ? <div className="auth-success">{authMessage}</div> : null}
                <button type="submit" className="account-button auth-submit">
                  Đăng ký
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <div className="floating-actions" aria-hidden="true">
        <a href="#">Call</a>
        <a href="#">Chat</a>
        <a href="#">Zalo</a>
      </div>
    </div>
  )
}

export default App

