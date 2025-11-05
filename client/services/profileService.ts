import apiClient, { API_BASE_URL } from "@/lib/api";

export interface ProfileData {
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  avatar?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'cashier';
}

class ProfileService {
  // ✅ Fetch profile data
  async getProfile(): Promise<User | null> {
    try {
      const response = await apiClient.get("/api/profile");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  // ✅ Update profile info (name, email, password)
  async updateProfile(data: ProfileData): Promise<User> {
    try {
      const response = await apiClient.put("/api/profile", data);

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }

      // If no data but success = true, return fallback
      if (response.status === 200) {
        return {
          id: "temp-id",
          name: data.name,
          email: data.email,
          avatar: data.avatar || "",
          role: "admin",
        };
      }

      throw new Error("Failed to update profile");
    } catch (error: any) {
      console.error("ProfileService - Error updating profile:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      throw error;
    }
  }

  // ✅ Upload avatar and return the hosted URL
  async uploadProfileImage(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await apiClient.post("/api/profile/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("📦 Upload Response:", response.data);

      const rawAvatar =
        response.data?.result?.avatarUrl ||
        response.data?.result?.user?.avatar ||
        response.data?.data?.avatar ||
        "";

      if (!rawAvatar) throw new Error("No avatar URL returned from server");

      // -----------------
      // Normalize URL
      // -----------------
      let normalized = rawAvatar.trim();

      try {
        const apiUrl = new URL(API_BASE_URL);

        if (!/^https?:\/\//i.test(normalized)) {
          // Relative path → URL-join with API origin to avoid double slashes
          normalized = new URL(normalized, apiUrl.origin).href;
        } else {
          // Absolute path → if different origin, rewrite to API origin
          const parsed = new URL(normalized);
          if (parsed.origin !== apiUrl.origin) {
            const pathWithQuery = parsed.pathname + (parsed.search || "");
            normalized = `${apiUrl.origin}${pathWithQuery}`;
          }
        }
      } catch (err) {
        console.warn("⚠️ URL normalization failed:", err);
      }

      // Cache busting query param (forces image refresh)
      const sep = normalized.includes("?") ? "&" : "?";
      const avatarUrl = `${normalized}${sep}t=${Date.now()}`;

      console.log("✅ Final avatar URL:", avatarUrl);

      return { avatarUrl };
    } catch (error: any) {
      console.error("❌ Error uploading profile image:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      throw error;
    }
  }
}
  


const profileService = new ProfileService();
export default profileService;
