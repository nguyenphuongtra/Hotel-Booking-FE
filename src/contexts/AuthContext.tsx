import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'

interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  isLocked?: boolean
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>
  setUser: (user: User | null) => void
  setAuthState: (token: string, user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const queryClient = useQueryClient()

  /**
   * Lưu trạng thái đăng nhập
   *
   * Mock data sử dụng:
   * - token
   * - mock_current_user_v2
   */
  const applyAuthState = useCallback(
    (newToken: string, newUser: User) => {
      localStorage.setItem('token', newToken)
      localStorage.setItem(
        'mock_current_user_v2',
        JSON.stringify(newUser)
      )

      setToken(newToken)
      setUser(newUser)
    },
    []
  )

  /**
   * Khởi tạo auth từ localStorage
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('mock_current_user_v2')

    if (storedToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser)

        setToken(storedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error(
          'Lỗi parse user từ localStorage:',
          error
        )

        localStorage.removeItem('token')
        localStorage.removeItem('mock_current_user_v2')

        setToken(null)
        setUser(null)
      }
    }

    setIsLoading(false)
  }, [])

  /**
   * LOGIN
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authAPI.login({
          email,
          password,
        })

        /**
         * Mock API trả:
         *
         * {
         *   data: {
         *     data: {
         *       token,
         *       user
         *     }
         *   }
         * }
         */
        const {
          token: newToken,
          user: newUser,
        } = response.data.data

        if (!newToken || !newUser) {
          throw new Error(
            'Mock API không trả về token hoặc user'
          )
        }

        applyAuthState(newToken, newUser)

        toast.success('Đăng nhập thành công!')
      } catch (error: any) {
        console.error('Login error:', error)

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Email hoặc mật khẩu không đúng'

        toast.error(message)

        throw error
      }
    },
    [applyAuthState]
  )

  /**
   * REGISTER
   */
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ) => {
      try {
        const response = await authAPI.register({
          name,
          email,
          password,
        })

        const {
          token: newToken,
          user: newUser,
        } = response.data.data

        if (!newToken || !newUser) {
          throw new Error(
            'Mock API không trả về token hoặc user'
          )
        }

        applyAuthState(newToken, newUser)

        toast.success(
          'Đăng ký thành công! Chào mừng bạn!'
        )
      } catch (error: any) {
        console.error('Register error:', error)

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Đăng ký thất bại'

        toast.error(message)

        throw error
      }
    },
    [applyAuthState]
  )

  /**
   * LOGOUT
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('mock_current_user_v2')

    setToken(null)
    setUser(null)

    queryClient.clear()

    toast.success('Đã đăng xuất')
  }, [queryClient])

  const value: AuthContextType = {
    user,
    token,

    /**
     * Chỉ authenticated khi có cả token và user
     */
    isAuthenticated: !!token && !!user,

    isLoading,

    login,
    logout,
    register,

    setUser,

    setAuthState: applyAuthState,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth phải được dùng trong AuthProvider'
    )
  }

  return context
}
