// Browser-only mock repository. No HTTP request or backend is used.
import initialData from '../../public/data.json'

const DB_KEY = 'hotel_mock_db_v2'
const TOKEN_KEY = 'token'
const CURRENT_USER_KEY = 'mock_current_user_v2'
type DB = { rooms: any[]; users: any[]; bookings: any[]; coupons: any[]; blogs: any[] }
const response = (data: any) => Promise.resolve({ data })
const authResponse = (data: any) => Promise.resolve({ data: { data } })

async function getDB(): Promise<DB> {
  const saved = localStorage.getItem(DB_KEY)
  if (saved) return JSON.parse(saved)
  const data: DB = JSON.parse(JSON.stringify({ rooms: initialData.rooms ?? [], users: initialData.users ?? [], bookings: initialData.bookings ?? [], coupons: initialData.coupons ?? [], blogs: [] }))
  localStorage.setItem(DB_KEY, JSON.stringify(data))
  return data
}
const save = (data: DB) => localStorage.setItem(DB_KEY, JSON.stringify(data))
const createId = (prefix: string) => `${prefix}_${Date.now()}`

export const authAPI = {
  async register(data: { name: string; email: string; password: string }) {
    const db = await getDB()
    if (db.users.some(user => user.email.toLowerCase() === data.email.trim().toLowerCase())) return Promise.reject({ message: 'Email đã được sử dụng' })
    const user = { _id: createId('user'), name: data.name, email: data.email, password: data.password, role: 'user' }
    db.users.push(user); save(db)
    const token = `mock-token-${user._id}`
    localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    return authResponse({ token, user })
  },
  async login(data: { email: string; password: string }) {
    const db = await getDB()
    const user = db.users.find(item => item.email.toLowerCase() === data.email.trim().toLowerCase())
    if (!user || user.password !== data.password || !['admin', 'user'].includes(user.role)) return Promise.reject({ message: 'Email, mật khẩu hoặc quyền tài khoản không hợp lệ' })
    const token = `mock-token-${user._id}`
    localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    return authResponse({ token, user })
  },
  googleAuth: () => undefined,
  googleCallback: (token: string) => localStorage.setItem(TOKEN_KEY, token),
}

export const userAPI = {
  async getAllUsers() { return response({ users: (await getDB()).users }) },
  async getCurrentUser() { const stored = localStorage.getItem(CURRENT_USER_KEY); if (stored) return response(JSON.parse(stored)); const db = await getDB(); const token = localStorage.getItem(TOKEN_KEY); return response(db.users.find(user => token?.includes(user._id)) ?? null) },
  refreshCurrentUser: async () => userAPI.getCurrentUser(),
  async getUserById(userId: string) { return response((await getDB()).users.find(user => user._id === userId) ?? null) },
  async updateUserRole(userId: string, data: { role: 'user' | 'admin' }) { const db = await getDB(); const user = db.users.find(item => item._id === userId); if (user) user.role = data.role; save(db); return response(user) },
  async lockUser(userId: string) { const db = await getDB(); const user = db.users.find(item => item._id === userId); if (user) user.isLocked = true; save(db); return response({ success: true }) },
  async unlockUser(userId: string) { const db = await getDB(); const user = db.users.find(item => item._id === userId); if (user) user.isLocked = false; save(db); return response({ success: true }) },
  async deleteUser(userId: string) { const db = await getDB(); db.users = db.users.filter(user => user._id !== userId); save(db); return response({ success: true }) },
}

export const roomAPI = {
  async listRooms(params?: Record<string, any>) { let rooms = [...(await getDB()).rooms]; if (params?.limit) rooms = rooms.slice(0, Number(params.limit)); return response({ rooms, meta: { total: rooms.length } }) },
  async getRoom(roomId: string) { return response((await getDB()).rooms.find(room => room._id === roomId) ?? null) },
  async createRoom(data: Record<string, any>) { const db = await getDB(); const room = { _id: createId('room'), ...data }; db.rooms.push(room); save(db); return response(room) },
  async updateRoom(roomId: string, data: Record<string, any>) { const db = await getDB(); const room = db.rooms.find(item => item._id === roomId); if (room) Object.assign(room, data); save(db); return response(room) },
  async deleteRoom(roomId: string) { const db = await getDB(); db.rooms = db.rooms.filter(room => room._id !== roomId); save(db); return response({ success: true }) },
}

export const bookingAPI = {
  async createBooking(data: Record<string, any>) { const db = await getDB(); const user = (await userAPI.getCurrentUser()).data; const booking = { _id: createId('booking'), ...data, userId: user?._id, user, room: db.rooms.find(room => room._id === data.roomId), status: 'confirmed', paymentStatus: data.paymentMethod === 'cash' ? 'unpaid' : 'paid', createdAt: new Date().toISOString() }; db.bookings.push(booking); save(db); return response(booking) },
  async getMyBookings() { const db = await getDB(); const user = (await userAPI.getCurrentUser()).data; return response({ bookings: db.bookings.filter(item => item.userId === user?._id) }) },
  async getAllBookings() { return response({ bookings: (await getDB()).bookings }) },
  async getBookingById(bookingId: string) { return response((await getDB()).bookings.find(item => item._id === bookingId) ?? null) },
  async deleteBooking(bookingId: string) { const db = await getDB(); db.bookings = db.bookings.filter(item => item._id !== bookingId); save(db); return response({ success: true }) },
  async updateBookingStatus(bookingId: string, data: { status: string }) { const db = await getDB(); const booking = db.bookings.find(item => item._id === bookingId); if (booking) booking.status = data.status; save(db); return response(booking) },
}

export const couponAPI = {
  async createCoupon(data: any) { const db = await getDB(); const coupon = { _id: createId('coupon'), ...data }; db.coupons.push(coupon); save(db); return response(coupon) },
  async getCouponByCode(code: string) { const coupon = (await getDB()).coupons.find(item => item.code.toLowerCase() === code.toLowerCase() && item.active !== false); return coupon ? response({ success: true, coupon }) : Promise.reject({ message: 'Mã giảm giá không hợp lệ' }) },
  async getAllCoupons() { return response({ coupons: (await getDB()).coupons }) },
  async updateCoupon(id: string, data: any) { const db = await getDB(); const coupon = db.coupons.find(item => item._id === id); if (coupon) Object.assign(coupon, data); save(db); return response(coupon) },
  async deleteCoupon(id: string) { const db = await getDB(); db.coupons = db.coupons.filter(item => item._id !== id); save(db); return response({ success: true }) },
}

export const paymentAPI = { createPaymentUrl: async (data: { bookingId: string; amount?: number; orderDescription?: string }) => response({ code: '00', data: `/success?vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TxnRef=${encodeURIComponent(data.bookingId)}` }), vnpayReturn: async (params: any) => response(params), vnpayIPN: async (params: any) => response(params) }
export const adminAPI = {}
export const blogAPI = {
  async createBlog(data: any) { const db = await getDB(); const blog = { _id: createId('blog'), ...data }; db.blogs.push(blog); save(db); return response(blog) },
  async getBlogById(id: string) { return response((await getDB()).blogs.find(item => item._id === id) ?? null) },
  async getAllBlogs() { return response({ blogs: (await getDB()).blogs }) },
  async updateBlog(id: string, data: any) { const db = await getDB(); const blog = db.blogs.find(item => item._id === id); if (blog) Object.assign(blog, data); save(db); return response(blog) },
  async deleteBlog(id: string) { const db = await getDB(); db.blogs = db.blogs.filter(item => item._id !== id); save(db); return response({ success: true }) },
  async toggleBlogActive(id: string) { const db = await getDB(); const blog = db.blogs.find(item => item._id === id); if (blog) blog.active = !blog.active; save(db); return response(blog) },
}
export const reviewsAPI = { submitReview: async (_roomId: string, _data: any) => response({ success: true }), getReviewsByRoom: async (_roomId: string) => response([]), deleteReview: async (_reviewId: string) => response({ success: true }) }
export const setAuthToken = (token: string) => { if (token) localStorage.setItem(TOKEN_KEY, token) }
export const clearAuthToken = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CURRENT_USER_KEY) }
export const getAuthToken = () => localStorage.getItem(TOKEN_KEY)
export const isAuthenticated = () => !!getAuthToken()
export const createFormData = (data: Record<string, any>, files?: File[], field = 'images') => { const form = new FormData(); Object.entries(data).forEach(([key, value]) => { if (value != null) form.append(key, value as string) }); files?.forEach(file => form.append(field, file)); return form }
