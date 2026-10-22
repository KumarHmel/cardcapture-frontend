import { useEffect, useState } from 'react';
import LogoutButton from './LogoutButton';
import { useUtility } from '../../context/utility.context';
import LoginButton from './LoginButton';
import ProfileButton from './ProfileButton';
import { NavLink, useLocation } from 'react-router-dom';
import apiService from '../../service/apiService';

export default function Header() {
  const { token, searchTerm, setSearchTerm, role } = useUtility();
  const location = useLocation();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  // Fetch profile image when component mounts or token changes
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!token) {
        setProfileImage(null);
        setImageError(false);
        return;
      }

      try {
        const data = await apiService.getProfile();
        // Handle different response structures
        const profile = data?.profile || data?.user || data?.data || data;
        const imageUrl = profile?.profileImage;
        
        if (imageUrl) {
          setProfileImage(imageUrl);
          setImageError(false);
        } else {
          setProfileImage(null);
        }
      } catch (error) {
        console.error('Failed to fetch profile image:', error);
        setProfileImage(null);
        setImageError(false);
      }
    };

    fetchProfileImage();

    // Listen for profile update events (when profile is updated in ProfileModal)
    const handleProfileUpdate = () => {
      fetchProfileImage();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [token]);

  // Function to generate breadcrumb based on current route
  const getBreadcrumb = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return [  
        { label: 'HMEL', href: '#' },
        { label: 'Cards', href: '#', active: true}
      ];
    } else if (path === '/dashboard/users') {
      return [
        { label: 'HMEL', href: '#' },
        { label: 'Users', href: '#', active: true }
      ];
    } else if (path.includes('/dashboard') && path !== '/dashboard' && path !== '/dashboard/users') {
      // For other dashboard routes, show Cards/All Cards
      return [
        { label: 'HMEL', href: '#' },
        { label: 'Cards', href: '#' },
        { label: 'All Cards', href: '#', active: true }
      ];
    }
    
    // Default breadcrumb
    return [
      { label: 'HMEL', href: '#' },
      { label: 'Dashboard', href: '#' },
      { label: 'Contacts', href: '#' },
      { label: 'List', href: '#', active: true }
    ];
  };
  


  return (
    <header>
      <div className="main-header d-flex flex-row justify-content-between align-items-center">
        <img src="/img/inner-pages-logo.svg" className="logo" alt="logo" />
        
        <ul className="header-list gap-5">
          <li>
           <div className="position-relative">
  <input
    type="text"
    className="form-control"
    placeholder={location.pathname === '/dashboard/users' ? 'Search users...' : 'Search cards...'}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    style={{ paddingRight: "30px" }} // extra space for icon/cancel
  />

  {!searchTerm ? (
    <span
      style={{
        position: "absolute",
        right: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "pointer",
      }}
    >
      <img src="/img/search-icon.svg" alt="search" style={{ width: "18px", height: "18px" }} />
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setSearchTerm("")}
      style={{
        position: "absolute",
        right: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        border: "none",
        background: "transparent",
        fontSize: "18px",
        color: "red",
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      ✖
    </button>
  )}
</div>

          </li>

          <li className="dropdown" style={{width: 'inherit!important'}}>
            <a
              href="javascript:void(0);"
              className="dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              
            >
              {profileImage && !imageError ? (
                <span style={{width: '36px', height: '36px'}}>
                <img 
                  src={profileImage} 
                  alt="profile" 
                  crossOrigin={profileImage.startsWith('data:') ? undefined : 'anonymous'}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setImageError(true);
                    console.warn('Failed to load profile image in header');
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
                </span>
              ) : (
                <img src="/img/avtar.jpg" alt="pic" />
              )}
            </a>
            <ul className="dropdown-menu">
              {!token &&
              <li className="danger-bg dropdown-item">
                <LoginButton />
              </li>}
              {token &&
              <>
              <li className="dropdown-item">
                <ProfileButton />
              </li>
              <li className="danger-bg dropdown-item">
                <LogoutButton />
              </li>
              </>
                }
            </ul>
          </li>
        </ul>
      </div>

      <div className="container">
        <div className="sub-header d-flex flex-row justify-content-between align-items-center">
          <nav>
            <ol className="breadcrumb">
              {getBreadcrumb().map((item, index) => (
                <li 
                  key={index}
                  className={`breadcrumb-item ${item.active ? 'active' : ''}`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.active ? (
                    item.label
                  ) : (
                    <a href={item.href}>{item.label}</a>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <ul className="nav nav-tabs" id="mainTab" role="tablist">
            <li className="nav-item" role="presentation">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <img
                  src="/img/contacts-icon.svg"
                  alt="contact"
                  style={{ width: '20px', height: '20px' }}
                />
                <span className="ml-3">Cards</span>
              </NavLink>
            </li>

            {role && role == "admin" && (
              <li className="nav-item" role="presentation">
                <NavLink
                  to="/dashboard/users"
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <img
                    src="/img/role-icon.svg"
                    alt="role"
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span className="ml-2">User Management</span>
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}
