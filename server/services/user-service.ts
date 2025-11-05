export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  // Mock user data - in real app this would be from database
  private users: User[] = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@electromart.com',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Cashier User',
      email: 'cashier@electromart.com',
      role: 'cashier',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date(),
    };
    return this.users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    this.users.splice(userIndex, 1);
    return true;
  }

  // Authentication methods
  async authenticate(email: string, password: string): Promise<{ success: boolean; message?: string; token?: string; user?: User; expiresIn?: number }> {
    const user = this.users.find(u => u.email === email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    // In real app, verify password hash
    if (password === 'password') { // Mock password check
      return {
        success: true,
        token: 'mock-jwt-token',
        user,
        expiresIn: 3600
      };
    }
    return { success: false, message: 'Invalid credentials' };
  }

  async refreshToken(refreshToken: string): Promise<{ success: boolean; message?: string; token?: string; expiresIn?: number }> {
    // Mock refresh token logic
    return {
      success: true,
      token: 'new-mock-jwt-token',
      expiresIn: 3600
    };
  }

  // Company settings methods
  async getCompanySettings(): Promise<any> {
    return {
      companyName: 'Savera Electronic',
      address: 'Delhi, India',
      phone: '+91-1234567890',
      email: 'info@saveraelectronic.com',
      gstNumber: '07AABCS1234A1Z5'
    };
  }

  async updateCompanySettings(updates: any, userId: string): Promise<any> {
    return { ...updates, updatedBy: userId, updatedAt: new Date() };
  }

  // Permission methods
  async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    
    // Mock permission logic
    if (user.role === 'admin') return true;
    if (permission === 'canCreateBills' && user.role === 'cashier') return true;
    return false;
  }
}
