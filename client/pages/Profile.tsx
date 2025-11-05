import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import profileService from "@/services/profileService";
import { Save, Loader2, AlertCircle, Upload } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  avatar?: string;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    avatar: user?.avatar || "",
  });

  // ✅ Sync user data when context updates
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  // ✅ Handle avatar upload
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { avatarUrl } = await profileService.uploadProfileImage(file);

      // ✅ Update local + global user
      setProfileData((prev) => ({ ...prev, avatar: avatarUrl }));
      updateUser({ ...user, avatar: avatarUrl });

      toast({
        title: "Profile Picture Updated",
        description: "Your avatar has been successfully changed.",
      });
    } catch (err) {
      console.error("❌ Error uploading image", err);
      toast({
        title: "Upload failed",
        description: "Could not upload profile image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ Compute display avatar URL
  const displayAvatar = React.useMemo(() => {
    const fallback = "/placeholder.svg"; // ensure this exists in public/
    const raw = (profileData.avatar || "").trim();
    if (!raw) return fallback;
    // Always use the normalized URL directly. Images are allowed cross-origin for <img> tags.
    return raw;
  }, [profileData.avatar]);

  // ✅ Handle input changes
  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ✅ Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};
    if (!profileData.name.trim()) newErrors.name = "Name is required";
    if (!profileData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email))
      newErrors.email = "Enter a valid email";

    if (profileData.newPassword && profileData.newPassword.trim() !== "") {
      if (profileData.newPassword.length < 6)
        newErrors.newPassword = "Password must be at least 6 characters";
      if (profileData.newPassword !== profileData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Save profile
  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        name: profileData.name,
        email: profileData.email,
      };

      if (profileData.newPassword && profileData.newPassword.trim() !== "") {
        updateData.newPassword = profileData.newPassword;
        if (profileData.currentPassword)
          updateData.currentPassword = profileData.currentPassword;
      }

      const updatedUser = await profileService.updateProfile(updateData);
      updateUser({ ...user, ...updatedUser });
      setHasChanges(false);

      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ✅ Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Picture</CardTitle>
            <CardDescription>Upload or change your avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col items-center">
            <div>
              <img
                src={displayAvatar}
                alt="avatar"
                crossOrigin="anonymous"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #22c55e",
                }}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Change Photo
                </>
              )}
            </Button>

            {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
          </CardContent>
        </Card>

        {/* ✅ Profile Info Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Change Password
                </h3>
                <p className="text-sm text-gray-500">
                  Leave blank to keep current password
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={(e) =>
                    handleInputChange("currentPassword", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={profileData.newPassword}
                  onChange={(e) =>
                    handleInputChange("newPassword", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
