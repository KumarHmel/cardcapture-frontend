import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import apiService from '../../service/apiService';

interface ProfileModalProps {
    onClose: () => void;
}

interface ProfileData {
    id?: number | string;
    azureAdId?: string;
    username?: string;
    email?: string;
    phone?: string | null;
    role?: string;
    status?: string;
    designation?: string | null;
    location?: string | null;
    profileImage?: string | null;
}

interface ProfileFormData {
    username: string;
    email: string;
    role: string;
    status: string;
    designation: string;
    phone: string;
    location: string;
    profileImage: string;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [showImageInput, setShowImageInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [formData, setFormData] = useState<ProfileFormData>({
        username: '',
        email: '',
        role: '',
        status: '',
        designation: '',
        phone: '',
        location: '',
        profileImage: ''
    });

    const normalizeProfileData = (data: unknown): ProfileData => {
        if (!data || typeof data !== 'object') {
            return {};
        }

        // Some APIs wrap the actual payload inside `data`, `profile`, or `user` keys.
        const payload =
            (data as any).profile ??
            (data as any).user ??
            (data as any).data ??
            data;

        if (!payload || typeof payload !== 'object') {
            return {};
        }

        return {
            id: (payload as any).id ?? (payload as any)._id ?? '',
            azureAdId: (payload as any).azureAdId ?? '',
            username: (payload as any).username ?? (payload as any).name ?? '',
            email: (payload as any).email ?? '',
            role: (payload as any).role ?? '',
            status: (payload as any).status ?? '',
            designation: (payload as any).designation ?? null,
            phone: (payload as any).phone ?? (payload as any).phoneNumber ?? null,
            location: (payload as any).location ?? '',
            profileImage: (payload as any).profileImage ?? null,
        };
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await apiService.getProfile();
                setProfileData(normalizeProfileData(data));
            } catch (err: any) {
                console.error('Failed to fetch profile:', err);
                setError(err?.response?.data?.message || 'Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
        
        return () => {
            // Restore body scrolling when modal closes
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (profileData) {
            const imageUrl = profileData.profileImage ?? '';
            setFormData({
                username: profileData.username ?? '',
                email: profileData.email ?? '',
                role: profileData.role ?? '',
                status: profileData.status ?? '',
                designation: profileData.designation ?? '',
                phone: profileData.phone ?? '',
                location: profileData.location ?? '',
                profileImage: imageUrl
            });
            setImagePreview(imageUrl || null);
            setImageError(false); // Reset error when new profile data loads
        }
    }, [profileData]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleInputChange = (field: keyof ProfileFormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }));
        
        // Update preview when profile image URL changes
        if (field === 'profileImage') {
            if (!value || isValidImageUrl(value)) {
                setImagePreview(value || null);
            } else {
                setError('Please enter a valid image URL (http:// or https://)');
            }
        }
    };

    const isValidImageUrl = (url: string): boolean => {
        if (!url) return false;
        // Allow data URLs for images (from file uploads)
        if (url.startsWith('data:image/')) return true;
        // Allow http/https URLs
        try {
            const urlObj = new URL(url);
            return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:');
        } catch {
            return false;
        }
    };

    const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (isValidImageUrl(result)) {
                    setImagePreview(result);
                    setFormData((prev) => ({
                        ...prev,
                        profileImage: result
                    }));
                    setError(null);
                } else {
                    setError('Invalid image format');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageClick = () => {
        setShowImageInput(!showImageInput);
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const updateData: any = {
                username: formData.username,
                designation: formData.designation || null,
                phone: formData.phone || null,
                location: formData.location || null
            };

            // Only include profileImage if the value has actually changed from the original
            // This ensures we don't send profileImage if the user didn't modify it
            const originalImage = profileData?.profileImage ?? '';
            const currentImage = formData.profileImage || '';
            
            // Only include profileImage if it's different from the original
            // If user didn't change the image, profileImage won't be included in the API call
            if (currentImage !== originalImage) {
                // Include the new value (can be a new image URL or null to clear)
                updateData.profileImage = currentImage || null;
            }
            // If images are the same, profileImage is not included in updateData

            const response = await apiService.updateProfile(updateData);

            const successResponse =
                response?.success === true ||
                response?.status === 'success' ||
                response?.status === 200 ||
                response?.status === 201 ||
                response?.statusCode === 200 ||
                response?.statusCode === 201 ||
                response?.code === 200 ||
                response?.code === 201 ||
                (typeof response?.message === 'string' &&
                    response.message.toLowerCase().includes('success'));
            
            if (successResponse) {
                setSuccessMessage('Profile updated successfully!');
                // Refresh profile data
                const updatedData = await apiService.getProfile();
                setProfileData(normalizeProfileData(updatedData));
                
                // Clear file upload input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                
                // Hide image input section
                setShowImageInput(false);
                
                // Dispatch event to notify Header component to refresh profile image
                window.dispatchEvent(new Event('profileUpdated'));
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
            } else {
                setError(response?.message || 'Failed to update profile. Please try again.');
            }
        } catch (err: any) {
            console.error('Failed to update profile:', err);
            setError(err?.response?.data?.message || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const modalContent = (
        <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                zIndex: 9999,
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
            }}
            onClick={handleBackdropClick}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                role="document"
                style={{
                    maxWidth: '500px',
                    width: '100%',
                    zIndex: 10000
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content" style={{
                    borderRadius: '12px',
                    padding: '25px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                    border: '2px solid #e9ecef',
                    backgroundColor: '#ffffff'
                }}>
                    <div className="modal-header" style={{
                        borderBottom: '2px solid #e9ecef',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px'
                    }}>
                        <h5 className="modal-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                            User Profile
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            aria-label="Close"
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '0',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div className="modal-body" style={{ paddingTop: 0 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p style={{ marginTop: '15px', color: '#666' }}>Loading profile...</p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div style={{
                                        padding: '15px',
                                        backgroundColor: '#f8d7da',
                                        border: '1px solid #f5c6cb',
                                        borderRadius: '8px',
                                        color: '#721c24',
                                        marginBottom: '20px'
                                    }}>
                                        <strong>Error:</strong> {error}
                                    </div>
                                )}
                                {successMessage && (
                                    <div style={{
                                        padding: '15px',
                                        backgroundColor: '#d1e7dd',
                                        border: '1px solid #badbcc',
                                        borderRadius: '8px',
                                        color: '#0f5132',
                                        marginBottom: '20px'
                                    }}>
                                        <strong>Success:</strong> {successMessage}
                                    </div>
                                )}
                                {profileData && (
                            <form id="profile-form" onSubmit={handleFormSubmit}>
                                <input type="hidden" name="id" value={profileData.id ?? ''} />
                                <input type="hidden" name="azureAdId" value={profileData.azureAdId ?? ''} />
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-username" className="form-label">
                                            Username
                                        </label>
                                        <input
                                            id="profile-username"
                                            type="text"
                                            className="form-control"
                                            value={formData.username}
                                            onChange={handleInputChange('username')}
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-email" className="form-label">
                                            Email
                                        </label>
                                        <input
                                            id="profile-email"
                                            type="email"
                                            className="form-control"
                                            value={formData.email}
                                            onChange={handleInputChange('email')}
                                            placeholder="Enter email" disabled
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-role" className="form-label">
                                            Role
                                        </label>
                                        <select disabled
                                            id="profile-role"
                                            className="form-select"
                                            value={formData.role}
                                        >
                                            <option value="">Select role</option>
                                            <option value="admin">Admin</option>
                                            <option value="non_admin">Non Admin</option>
                                        </select>
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-status" className="form-label">
                                            Status
                                        </label>
                                        <select disabled
                                            id="profile-status"
                                            className="form-select"
                                            value={formData.status}
                                        >
                                            <option value="">Select status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            
                                        </select>
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-designation" className="form-label">
                                            Designation
                                        </label>
                                        <input
                                            id="profile-designation"
                                            type="text"
                                            className="form-control"
                                            value={formData.designation}
                                            onChange={handleInputChange('designation')}
                                            placeholder="Enter designation"
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-phone" className="form-label">
                                            Phone
                                        </label>
                                        <input
                                            id="profile-phone"
                                            type="tel"
                                            className="form-control"
                                            value={formData.phone}
                                            onChange={handleInputChange('phone')}
                                            placeholder="Enter phone"
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label htmlFor="profile-location" className="form-label">
                                            Location
                                        </label>
                                        <input
                                            id="profile-location"
                                            type="text"
                                            className="form-control"
                                            value={formData.location}
                                            onChange={handleInputChange('location')}
                                            placeholder="Enter location"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Profile Image</label>
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center',
                                            marginBottom: '15px'
                                        }}>
                                            <div 
                                                style={{
                                                    position: 'relative',
                                                    width: '120px',
                                                    height: '120px',
                                                    cursor: 'pointer',
                                                    marginBottom: '10px'
                                                }}
                                                onClick={handleImageClick}
                                            >
                                                {/* Profile Image or Placeholder */}
                                                {imagePreview && isValidImageUrl(imagePreview) && !imageError ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Profile"
                                                        crossOrigin={imagePreview.startsWith('data:') ? undefined : 'anonymous'}
                                                        referrerPolicy="no-referrer"
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: '50%',
                                                            objectFit: 'cover',
                                                            border: '3px solid #e9ecef',
                                                            backgroundColor: '#f8f9fa'
                                                        }}
                                                        onError={(e) => {
                                                            // Handle CORS and other image loading errors gracefully
                                                            setImageError(true);
                                                            const target = e.target as HTMLImageElement;
                                                            // Log warning for debugging but don't show error to user
                                                            if (target.src && !target.src.startsWith('data:')) {
                                                                console.warn('Failed to load profile image (possibly CORS issue):', target.src);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#17a2b8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '3px solid #e9ecef'
                                                    }}>
                                                        <svg 
                                                            width="60" 
                                                            height="60" 
                                                            viewBox="0 0 24 24" 
                                                            fill="none" 
                                                            stroke="white" 
                                                            strokeWidth="1.5" 
                                                            strokeLinecap="round" 
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="12" cy="7" r="4"></circle>
                                                        </svg>
                                                    </div>
                                                )}
                                                
                                                {/* Pencil Icon Overlay */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '0',
                                                    right: '0',
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#0d6efd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '3px solid white',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                    cursor: 'pointer'
                                                }}>
                                                    <svg 
                                                        width="18" 
                                                        height="18" 
                                                        viewBox="0 0 24 24" 
                                                        fill="none" 
                                                        stroke="white" 
                                                        strokeWidth="2" 
                                                        strokeLinecap="round" 
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            
                                            {/* Image Input Options */}
                                            {showImageInput && (
                                                <div style={{
                                                    width: '100%',
                                                    padding: '15px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    border: '1px solid #dee2e6'
                                                }}>
                                                    <div className="mb-3">
                                                        <label className="form-label small">Upload Image</label>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageFileChange}
                                                            className="form-control form-control-sm"
                                                            style={{ fontSize: '0.875rem' }}
                                                        />
                                                    </div>
                                                    
                                                    <div style={{ display: 'none' }}>
                                                        <label className="form-label small">Image URL</label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={formData.profileImage}
                                                            onChange={handleInputChange('profileImage')}
                                                            placeholder="Enter image URL"
                                                            style={{ fontSize: '0.875rem' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </form>
                                )}
                            </>
                        )}
                    </div>

                    <div className="modal-footer" style={{
                        borderTop: '2px solid #e9ecef',
                        marginTop: '20px',
                        paddingTop: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px'
                    }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            form="profile-form"
                            disabled={loading || saving}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                border: '1px solid #0dcaf0',
                                backgroundColor: loading || saving ? '#6c757d' : '#0dcaf0',
                                color: '#212529',
                                fontWeight: 'bold',
                                cursor: loading || saving ? 'not-allowed' : 'pointer',
                                opacity: loading || saving ? 0.6 : 1
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                border: '1px solid #6c757d',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Use portal to render modal at document body level, outside dropdown hierarchy
    return createPortal(modalContent, document.body);
}

