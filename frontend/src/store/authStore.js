import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Set authentication token
      setToken: (token) => {
        set({ token });
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete axios.defaults.headers.common['Authorization'];
        }
      },

      // Login action
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('/auth/login', {
            email,
            password,
          });

          const { token, user } = response.data;
          
          set({ 
            user, 
            token, 
            isLoading: false,
            error: null 
          });
          
          get().setToken(token);
          
          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          return { success: false, error: errorMessage };
        }
      },

      // Register action
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('/auth/register', userData);
          
          const { token, user } = response.data;
          
          set({ 
            user, 
            token, 
            isLoading: false,
            error: null 
          });
          
          get().setToken(token);
          
          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          return { success: false, error: errorMessage };
        }
      },

      // Logout action
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          error: null 
        });
        get().setToken(null);
      },

      // Check authentication status
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        get().setToken(token);

        try {
          const response = await axios.get('/auth/profile');
          const user = response.data;
          
          set({ 
            user, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
          set({ isLoading: false });
        }
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.put('/auth/profile', profileData);
          const updatedUser = response.data;
          
          set({ 
            user: updatedUser, 
            isLoading: false,
            error: null 
          });
          
          return { success: true, user: updatedUser };
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Profile update failed';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          return { success: false, error: errorMessage };
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'vivirion-auth',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user 
      }),
    }
  )
);

export { useAuthStore };
