import { useEffect, useRef, useState } from 'react';
import { useUtility } from '../../context/utility.context';
import apiService from '../../service/apiService';
import Cookies from 'js-cookie';

interface User {
  id: number;
  name: string[];
  email: string[];
  phone: string[];
  address: string[];
  company: string;
  jobTitle: string;
  website: string;
  isPrivate?: boolean;
  userId?: number; // Add userId to track card owner
  isStatus?: boolean;
  createdAt?: string;
}

// interface RecordsResponse {
//   allcards?: any[];
//   mycards?: any[];
//   meta: {
//     page: number;
//     limit: number;
//     pageCount: number;
//     total: number;
//   };
// }

interface CardProps {
  records: any;
  cardType?: 'mycards' | 'allcards'; // Add prop to determine API type
}

export default function Card({ records, cardType }: CardProps) {
  
  const [filteredList, setFilteredList] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const didSearchInitRef = useRef(false);
  const didItemsInitRef = useRef(false);
  const didPageInitRef = useRef(false);
  const didInitialLoadRef = useRef(false);

  // Modal state for visibility confirmation
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityModalTitle, setVisibilityModalTitle] = useState('');
  const [visibilityModalMessage, setVisibilityModalMessage] = useState('');
  const [visibilityModalAction, setVisibilityModalAction] = useState<(() => void) | null>(null);

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalTitle, setDeleteModalTitle] = useState('');
  const [deleteModalMessage, setDeleteModalMessage] = useState('');
  const [deleteModalAction, setDeleteModalAction] = useState<(() => void) | null>(null);

  
  const { openModal, setCardDetails, searchTerm, role, sortBy, order, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage } = useUtility();
  const currentUserIdCookie = Cookies.get('userId');
  const currentUserId = currentUserIdCookie ? Number(currentUserIdCookie) : null;

  const formatCreatedDate = (createdAt?: string): string | null => {
    if (!createdAt) return null;

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  
  
  // Helper function to check if user can edit this card
  const canEditCard = (user: User) => {
    const isAdmin = role === 'admin';
    const isOwnCard = !!currentUserId && user.userId === currentUserId;
    return isAdmin || isOwnCard;
  };
  
  const handleModal = (user: User) => {
    
    // Transform the user data to match modal expectations for view mode
    const modalData = {
      id: user.id,
      name: Array.isArray(user.name) ? user.name : [user.name || ''],
      email: Array.isArray(user.email) ? user.email : [user.email || ''],
      phone: Array.isArray(user.phone) ? user.phone : [user.phone || ''],
      address: Array.isArray(user.address) ? user.address : [user.address || ''],
      company: user.company || '',
      jobTitle: user.jobTitle || '',
      website: user.website || '',
      isPrivate: user.isPrivate || false,
      userId: user.userId
    };
     
    setCardDetails(modalData);   
    openModal();

  };

  /* HIDDEN: Update Card Feature - handleEdit function
  const handleEdit = async(user: User) => {    
    // Transform the user data to match modal expectations
    const modalData = {
      id: user.id,
      name: Array.isArray(user.name) ? user.name : [user.name || ''],
      email: Array.isArray(user.email) ? user.email : [user.email || ''],
      phone: Array.isArray(user.phone) ? user.phone : [user.phone || ''],
      address: Array.isArray(user.address) ? user.address : [user.address || ''],
      company: user.company || '',
      jobTitle: user.jobTitle || '',
      website: user.website || '',
      isPrivate: user.isPrivate || false,
      userId: user.userId
    };
    // Set the card details first
    setCardDetails(modalData);
    // Set edit mode
    setIsEditMode(true);    
    // Open the modal
    openModal();

  };
  */

  const handleSave = (user: User) => {
    const vCardData = `
BEGIN:VCARD
VERSION:3.0
FN:${user.name}
TEL;TYPE=CELL:${user.phone}
EMAIL:${user.email}
ORG:${user.company}
TITLE:${user.jobTitle}
END:VCARD`;

    const blob = new Blob([vCardData], { type: 'text/vcard' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contact.vcf';
    link.click();
  };

  // Visibility toggle functions
  const showVisibilityConfirmationModal = (title: string, message: string, action: () => void) => {
    setVisibilityModalTitle(title);
    setVisibilityModalMessage(message);
    setVisibilityModalAction(() => action);
    setShowVisibilityModal(true);
  };

  const handleVisibilityModalConfirm = () => {
    if (visibilityModalAction) {
      visibilityModalAction();
    }
    setShowVisibilityModal(false);
    setVisibilityModalAction(null);
  };

  const handleVisibilityModalCancel = () => {
    setShowVisibilityModal(false);
    setVisibilityModalAction(null);
  };

  const handleVisibilityToggle = (user: User) => {
    const newVisibility = !user.isPrivate;
    const actionText = newVisibility ? 'hide' : 'show';
    const title = newVisibility ? 'Hide Card' : 'Show Card';
    const message = `Are you sure you want to ${actionText} this card?\n\nThis will make the card ${newVisibility ? 'private' : 'public'} and ${newVisibility ? 'not visible' : 'visible'} to other users.`;
    
    showVisibilityConfirmationModal(title, message, async () => {
      try {
        await apiService.visibility({
          id: user.id,
          isPrivate: newVisibility,
          status: true
        });
        
        // Update the local state
        const updatedList = filteredList.map(u => 
          u.id === user.id ? { ...u, isPrivate: newVisibility } : u
        );
        setFilteredList(updatedList);
        
        // Refresh data to ensure consistency
        await fetchData(currentPage, itemsPerPage, searchTerm, sortBy, order);
        
      } catch (error) {
        console.error('Error updating visibility:', error);
        alert('Error updating card visibility. Please try again.');
      }
    });
  };

  // Delete handlers
  const showDeleteConfirmationModal = (title: string, message: string, action: () => void) => {
    setDeleteModalTitle(title);
    setDeleteModalMessage(message);
    setDeleteModalAction(() => action);
    setShowDeleteModal(true);
  };

  const handleDeleteModalConfirm = () => {
    if (deleteModalAction) {
      deleteModalAction();
    }
    setShowDeleteModal(false);
    setDeleteModalAction(null);
  };

  const handleDeleteModalCancel = () => {
    setShowDeleteModal(false);
    setDeleteModalAction(null);
  };

  const handleDelete = (user: User) => {
    if (role !== 'admin') return;
    showDeleteConfirmationModal(
      'Delete Card',
      'Are you sure you want to delete this card? This action cannot be undone.',
      async () => {
        try {
          await apiService.deleteCard(user.id);
          const updated = filteredList.filter(u => u.id !== user.id);
          setFilteredList(updated);
          await fetchData(currentPage, itemsPerPage, searchTerm, sortBy, order);
        } catch (error) {
          console.error('Error deleting card:', error);
          alert('Failed to delete card. Please try again.');
        }
      }
    );
  };

  // Function to transform API data to User interface
  const transformData = (apiData: any[]): User[] => {
    return apiData.map((user: any) => ({
      id: user?.id,
      name: Array.isArray(user?.name) ? user.name.join(", ") : user?.name || '',
      email: Array.isArray(user?.email) ? user.email.join(", ") : user?.email || '',
      phone: Array.isArray(user?.phone_number) ? user.phone_number.join(", ") : user?.phone_number || '',
      address: Array.isArray(user?.address) ? user.address.join(", ") : user?.address || '',
      company: user?.company || '',
      jobTitle: user?.job_title || '',
      website: user?.website || '',
      isPrivate: user?.is_private || false,
      userId: user?.userId || user?.user_id,
      isStatus: user?.status || false,
      createdAt: user?.created_at || undefined,
    }));
  };

  // Fetch data from backend
  const fetchData = async (page: number, limit: number, search: string = '', sortBy: string = 'name', order: string = 'asc') => {
    setLoading(true);
    try {
      let response;
      // Use cardType prop directly to determine which API to call
      if (cardType === 'allcards') {
        response = await apiService.allcards(sortBy, order, limit.toString(), page.toString(), search);
      } else {
        response = await apiService.myCards(sortBy, order, limit.toString(), page.toString(), search);
      }
      
      
      if (response) {
        // Response structure should match the API call (allcards or mycards)
        const dataArray = response.allcards || response.mycards || response;
        const transformedData = transformData(dataArray);
        
        setFilteredList(transformedData);
        setTotalPages(response.meta?.pageCount || 0);
        setCurrentPage(response.meta?.page || page);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setFilteredList([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load from props
  useEffect(() => {
    // Handle both defined records and empty arrays
    if (records !== null && records !== undefined) {
      // Records is already the correct data array (myCardRecords or allCardRecords)
      // Check if records has nested structure or is direct array
      const dataArray = records.allcards || records.mycards || records;
      const transformedData = transformData(Array.isArray(dataArray) ? dataArray : []);
      setFilteredList(transformedData);
      setTotalPages(records.meta?.pageCount || 0);
      setCurrentPage(records.meta?.page || 1);
      
      // Mark initial load as complete
      didInitialLoadRef.current = true;
    } else {
      // If records is null/undefined, set empty list but still mark as loaded
      setFilteredList([]);
      didInitialLoadRef.current = true;
    }
  }, [records, cardType]); // Add cardType to dependencies to handle tab switches

  // Handle search/sort/order changes (skip first run to avoid duplicate initial fetch)
  useEffect(() => {
    if (!didSearchInitRef.current) {
      didSearchInitRef.current = true;
      return;
    }
    if (!didInitialLoadRef.current) {
      return; // Skip if initial load hasn't completed
    }
    setCurrentPage(1);
    fetchData(1, itemsPerPage, searchTerm, sortBy, order);
  }, [searchTerm, sortBy, order]);

  // Handle items per page changes (skip first run to avoid duplicate initial fetch)
  useEffect(() => {
    if (!didItemsInitRef.current) {
      didItemsInitRef.current = true;
      return;
    }
    if (!didInitialLoadRef.current) {
      return; // Skip if initial load hasn't completed
    }
    // Fetch data when itemsPerPage changes
    fetchData(currentPage, itemsPerPage, searchTerm, sortBy, order);
  }, [itemsPerPage]);

  // Handle currentPage changes (skip first run to avoid duplicate initial fetch)
  useEffect(() => {
    if (!didPageInitRef.current) {
      didPageInitRef.current = true;
      return; // Skip initial load
    }
    if (!didInitialLoadRef.current) {
      return; // Skip if initial load hasn't completed
    }
    fetchData(currentPage, itemsPerPage, searchTerm, sortBy, order);
  }, [currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const navBtnStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '6px',
    // disabled: loading
  };

  const ellipsisStyle: React.CSSProperties = {
    padding: '0 6px',
    fontSize: '16px',
    color: '#999'
  };

  const pageBtnStyle = (page: number, current: number = -1): React.CSSProperties => ({
    width: '40px',
    height: '40px',
    backgroundColor: page === current ? '#f0f0f0' : 'white',
    color: '#333',
    fontWeight: page === current ? 'bold' : 'normal',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    border: '1px solid #ddd'
  });

  const getShortPageWindow = (currentPage: number, totalPages: number): number[] => {
    let start = Math.max(currentPage - 1, 1);
    let end = Math.min(start + 2, totalPages);
    if (end - start < 2) {
      start = Math.max(end - 2, 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
    // fetchData will be called by useEffect when itemsPerPage changes
  };

  return (
    <>
      <div className="cards-view">
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading...
          </div>
        )}
        
        <div className="row">
          {filteredList.map((user, index) => (
            <div 
              key={user.id || index}
              className="col-lg-3 col-md-3 col-sm-12 col-xs-12 mb-3"
            >
              <div className="small-card h-100">
                <div className="d-flex flex-column justify-content-between align-items-center">
                  <img src="/img/avtar.jpg" className="user-pic" alt="user" />
                  <div className="small-card-info">
                    <h3>{user.name}</h3>
                  
          <span className="sub-title mb-2 d-block pb-2 border-bottom">
            {user.jobTitle}
          </span>
        

        {user.company && (
          <span className="d-flex flex-row justify-content-center align-items-center mb-1">
            <img src="img/company-icon.svg" className="small-icon" alt="company" />
            <span className="light-text ml-3">{user.company}</span>
          </span>
        )}

        {user.email && (
          <span className="d-flex flex-row justify-content-center align-items-center mb-1">
            <img src="img/email-icon.svg" alt="email" />
            <span className="light-text ml-3">{user.email}</span>
          </span>
        )}

        {user.phone && (
          <span className="d-flex flex-row justify-content-center align-items-center mb-1">
            <img src="img/phone-icon.svg" alt="phone" />
            <span className="light-text ml-3">{user.phone}</span>
          </span>
        )}

        {user.address && (
          <span className="d-flex flex-row justify-content-center align-items-center">
            <img src="img/location-icon.svg" alt="location" />
            <span className="light-text ml-3">{user.address}</span>
          </span>
        )}

        {formatCreatedDate(user.createdAt) && (
          <span className="d-flex flex-row justify-content-center align-items-center mt-1">
            <img src="/img/createdat.svg" className="small-icon" alt="created date" />
            <span className="light-text ml-3">
              Created: {formatCreatedDate(user.createdAt)}
            </span>
          </span>
        )}

        {/* Status and Visibility badges */}
        <div className="d-flex flex-row justify-content-center align-items-center gap-2 mt-2">
          {/* Status: visible only for admin */}
          {role === 'admin' && (
            <span
              className={`badge ${user.isStatus ? 'bg-success' : 'bg-secondary'}`}
              title="Card status"
            >
              {user.isStatus ? 'Active' : 'Inactive'}
            </span>
          )}
          {/* Visibility: visible for everyone */}
          <span
            className={`badge ${user.isPrivate ? 'bg-warning text-dark' : 'bg-info text-dark'}`}
            title="Card visibility"
          >
            {user.isPrivate ? 'Private' : 'Public'}
          </span>
        </div>
                  </div>
                  <div className="dropdown no-dropdown">
                    <a 
                      href="javascript:void(0);" 
                      className="dropdown-toggle"
                      data-bs-toggle="dropdown" 
                      aria-expanded="false"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none">
                        <path d="M10.5001 10.8332C10.9603 10.8332 11.3334 10.4601 11.3334 9.99984C11.3334 9.5396 10.9603 9.1665 10.5001 9.1665C10.0398 9.1665 9.66675 9.5396 9.66675 9.99984C9.66675 10.4601 10.0398 10.8332 10.5001 10.8332Z" fill="#164071" stroke="#164071" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.5001 5.00016C10.9603 5.00016 11.3334 4.62707 11.3334 4.16683C11.3334 3.70659 10.9603 3.3335 10.5001 3.3335C10.0398 3.3335 9.66675 3.70659 9.66675 4.16683C9.66675 4.62707 10.0398 5.00016 10.5001 5.00016Z" fill="#164071" stroke="#164071" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.5001 16.6667C10.9603 16.6667 11.3334 16.2936 11.3334 15.8333C11.3334 15.3731 10.9603 15 10.5001 15C10.0398 15 9.66675 15.3731 9.66675 15.8333C9.66675 16.2936 10.0398 16.6667 10.5001 16.6667Z" fill="#164071" stroke="#164071" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    <ul className="dropdown-menu">
                      <li className="danger-bg">
                        <button className="dropdown-item" onClick={() => handleSave(user)}>
                          Save Card
                        </button>
                      </li>
                      <li className="danger-bg">
                        <button className="dropdown-item" onClick={() => handleModal(user)}>
                          View Card
                        </button>
                      </li>                    
                      {/* Edit button - Admin can edit all cards, non-admin can only edit their own cards */}
                      {/* HIDDEN: Update Card Feature
                      {canEditCard(user) && (
                        <li className="danger-bg">
                          <button 
                            className="dropdown-item" 
                            onClick={() => {
                              handleEdit(user);
                            }}
                          >
                            Update Card
                          </button>
                        </li>
                      )}
                      */}
                      {/* Visibility toggle - Only owner or admin */}
                      {canEditCard(user) && (
                        <li className="danger-bg">
                          <button className="dropdown-item" onClick={() => handleVisibilityToggle(user)}>
                            {user.isPrivate ? 'Show Card' : 'Hide Card'}
                          </button>
                        </li>
                      )}
                      {/* Delete - Admin only */}
                      {role === 'admin' && (
                        <li className="danger-bg">
                          <button className="dropdown-item" onClick={() => handleDelete(user)}>
                            Delete Card
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 0 && (
        <div style={{
          marginTop: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px dotted #ddd',
            borderRadius: '12px',
            padding: '8px 40px',
            backgroundColor: '#fff'
          }}>
            {/* First Page */}
            <button 
              onClick={goToFirstPage} 
              disabled={currentPage === 1 || loading} 
              style={navBtnStyle}
            >
              &laquo;
            </button>

            {/* Previous Page */}
            <button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 1 || loading} 
              style={navBtnStyle}
            >
              &lsaquo;
            </button>

            {/* Ellipsis on left */}
            {currentPage > 2 && (
              <span style={ellipsisStyle}>...</span>
            )}

            {/* Current Page Window (only 3 pages shown max) */}
            {getShortPageWindow(currentPage, totalPages).map((page) => (
              <button 
                key={page} 
                onClick={() => goToPage(page)} 
                style={pageBtnStyle(page, currentPage)}
                disabled={loading}
              >
                {page}
              </button>
            ))}

            {/* Ellipsis on right */}
            {currentPage < totalPages - 1 && (
              <span style={ellipsisStyle}>...</span>
            )}

            {/* Next Page */}
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages || loading} 
              style={navBtnStyle}
            >
              &rsaquo;
            </button>

            {/* Last Page */}
            <button 
              onClick={goToLastPage} 
              disabled={currentPage === totalPages || loading} 
              style={navBtnStyle}
            >
              &raquo;
            </button>
          </div>

          <div className="">
            <div className="flex items-center space-x-2">
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                disabled={loading}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bootstrap Modal for Visibility Confirmation */}
      <div className={`modal fade ${showVisibilityModal ? 'show' : ''}`} style={{ display: showVisibilityModal ? 'block' : 'none' }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{visibilityModalTitle}</h5>
              <button type="button" className="btn-close" onClick={handleVisibilityModalCancel} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{visibilityModalMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleVisibilityModalCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleVisibilityModalConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal backdrop */}
      {showVisibilityModal && <div className="modal-backdrop fade show"></div>}

      {/* Bootstrap Modal for Delete Confirmation */}
      <div className={`modal fade ${showDeleteModal ? 'show' : ''}`} style={{ display: showDeleteModal ? 'block' : 'none' }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{deleteModalTitle}</h5>
              <button type="button" className="btn-close" onClick={handleDeleteModalCancel} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{deleteModalMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleDeleteModalCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteModalConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      {showDeleteModal && <div className="modal-backdrop fade show"></div>}
    </>
  );
}
