export const supabase = {
  auth: {
    signInWithPassword: async () => ({ data: null, error: null }),
    updateUser: async () => ({ data: null, error: null }),
    getUser: async () => ({ data: null, error: null }),
  },
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  }),
};