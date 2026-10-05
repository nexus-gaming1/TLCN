import { useState, useEffect } from 'react';
import profileService from '../../../shared/api/profile.service';

/**
 * Custom Hook for Customer Profile
 * Separates data fetching, form handling, and API sync from UI rendering.
 */
export function useCustomerProfile(memberId) {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!memberId && memberId !== 0) {
      setLoading(false);
      setError('Chưa xác thực người dùng hoặc thiếu mã thành viên hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }
    fetchProfile();
  }, [memberId]);

  const fetchProfile = async () => {
    if (!memberId && memberId !== 0) return;
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getProfile(memberId);
      setProfile(data);
      setFormData({
        full_name: data.full_name,
        phone: data.phone || ''
      });
    } catch (err) {
      console.error('Lỗi khi tải thông tin hồ sơ:', err);
      setError(err.message || 'Không thể tải thông tin hồ sơ từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = async (newAvatarUrl) => {
    try {
      setSaving(true);
      const updated = await profileService.updateAvatar(memberId, newAvatarUrl);
      if (updated && updated.data) {
        setProfile(updated.data);
      } else {
        setProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
      }
      setMessage('Đã cập nhật ảnh đại diện thành công!');
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật ảnh đại diện.');
      setTimeout(() => setError(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      // Save basic profile
      await profileService.updateProfile(memberId, formData);

      setMessage('Lưu thay đổi hồ sơ cá nhân thành công!');
      setTimeout(() => setMessage(null), 2000);
      await fetchProfile();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin:', err);
      setError(err.message || 'Lỗi hệ thống khi lưu thay đổi.');
      setTimeout(() => setError(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = profile ? (
    formData.full_name !== profile.full_name ||
    formData.phone !== (profile.phone || '')
  ) : false;

  return {
    profile,
    formData,
    loading,
    saving,
    message,
    error,
    isDirty,
    handleAccountFormChange,
    handleAvatarChange,
    handleSaveProfile
  };
}
