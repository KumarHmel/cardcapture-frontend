import { useState, useEffect, useRef } from 'react';
import apiService from '../../service/apiService';
import { useUtility } from '../../context/utility.context';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
interface Person {
  id: number,
  username: string,
  email: string,
  status: string,
  role: string
}

const UsersTable = () => {
  const { searchTerm, role, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage } = useUtility();
  const [authorization, setAuthorization] = useState<boolean | null>(null);
  const [backendErrorMessage, setBackendErrorMessage] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  const isFirstLoad = useRef(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get current user ID from cookies
  const currentUserId = Cookies.get('userId');
  const currentUserIdNumber = currentUserId ? parseInt(currentUserId, 10) : null;
  
  // Helper function to check if a person is the current user
  const isCurrentUser = (personId: number): boolean => {
    return currentUserIdNumber !== null && personId === currentUserIdNumber;
  };
  // Block non-admins
  if(role !== "admin"){
    return <Navigate to="/dashboard" />
  }
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  //Fetching Users
  useEffect(() => {
    const fetchUsersDetail = async () => {
      
      setLoading(true);
      try {
        const response = await apiService.getAllUsers(
          currentPage, // Context uses 1-based pagination
          itemsPerPage
        );
      
        setPeople(response.allUsers);
        setTotalPages(response.totalPages || 1);
        setAuthorization(true)
        if (isFirstLoad.current) {
          setCurrentPage(1);
          isFirstLoad.current = false;
        }
      } catch (error: any) {
        console.log('Error fetching users, setting loading to false');
        setAuthorization(false)
        setBackendErrorMessage(error.response.data.message)
      } finally {
        setLoading(false);
      }
    };
    fetchUsersDetail();
  }, [itemsPerPage, currentPage]);

  // Handle global search term changes
  useEffect(() => {
    const handleGlobalSearch = async () => {
      setLoading(true);
      try {
        if (!searchTerm || searchTerm.trim() === '') {
          // If search is empty, fetch all users
          const response = await apiService.getAllUsers(
            currentPage, // Context uses 1-based pagination
            itemsPerPage
          );
          setPeople(response.allUsers);
          setTotalPages(response.totalPages || 1);
          setCurrentPage(1);
        } else {
          // Search by user ID
          const id = parseInt(searchTerm, 10);
          if (isNaN(id)) {
            // If not a number, search by email using API search parameter
            const response = await apiService.getAllUsers(
              currentPage, // Context uses 1-based pagination
              itemsPerPage,
              undefined, // status
              undefined, // role
              searchTerm // search parameter
            );
            setPeople(response.allUsers);
            setTotalPages(response.totalPages || 1);
            setCurrentPage(1);
          } else {
            // Search by ID
            const response = await apiService.getUserById(id);
            if (response?.user) {
              setPeople([response.user]);
              setTotalPages(1);
            } else {
              setPeople([]);
              setTotalPages(1);
            }
            setCurrentPage(1);
          }
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setPeople([]);
      } finally {
        setLoading(false);
      }
    };

    handleGlobalSearch();
  }, [searchTerm]);


  // API handles pagination, so we display all returned users
  const currentItems = people;

  //Handler for next page button
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  //Handler for previous page button
  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  //Handler for pagination
  const handlePageClick = (pageIndex: number) => {
    setCurrentPage(pageIndex + 1); // Convert 0-based to 1-based
  };

  // Modal helper functions
  const showConfirmationModal = (title: string, message: string, action: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setShowModal(true);
  };

  const handleModalConfirm = () => {
    if (modalAction) {
      modalAction();
    }
    setShowModal(false);
    setModalAction(null);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setModalAction(null);
  };

  //PATCH API for modifying status of users
  const handleStatusToggle = async (index: number) => {
    const person = people[index];
    
    // Prevent users from updating their own status
    if (isCurrentUser(person.id)) {
      alert('You cannot change your own status. Please contact another administrator.');
      return;
    }
    
    const newStatus = person.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'activate' : 'deactivate';
    
    const title = `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`;
    const message = `Are you sure you want to ${actionText} the user "${person.email}"?\n\nThis will ${newStatus === 'active' ? 'enable' : 'disable'} their account access.`;
    
    showConfirmationModal(title, message, async () => {
      const action = newStatus === 'active' ? 'enable' : 'disable';

      try {
        await apiService.updateUserStatus(person.id, action);

        const updatedPeople = [...people];
        updatedPeople[index].status = newStatus;
        setPeople(updatedPeople);
      } catch (error) {
        console.log({ 'statusCode': 401, 'message': 'Unauthorized' });
      }
    });
  };

  //PATCH API for modifying role of users
  const handleRoleToggle = async (index: number) => {
    const person = people[index];
    
    // Prevent users from updating their own role
    if (isCurrentUser(person.id)) {
      alert('You cannot change your own role. Please contact another administrator.');
      return;
    }
    
    // Prevent role changes for inactive users
    if (person.status === 'inactive') {
      console.log('Cannot change role for inactive users');
      return;
    }
    
    const newRole = person.role === 'admin' ? 'user' : 'admin';
    const roleText = newRole === 'admin' ? 'admin' : 'regular user';
    
    const title = newRole === 'admin' ? 'Grant Admin Access' : 'Remove Admin Access';
    const message = `Are you sure you want to grant admin access to "${person.email}"?\n\nThis will make them a ${roleText} with ${newRole === 'admin' ? 'administrative' : 'limited'} privileges.`;
    
    showConfirmationModal(title, message, async () => {
      const action = newRole === 'admin' ? 'make_admin' : 'remove_admin';

      try {
        await apiService.updateUserRole(person.id, action);

        const updatedPeople = [...people];
        updatedPeople[index].role = newRole;
        setPeople(updatedPeople);
        const answerResponse = {
          "status": "success",
          "statusCode": 200,
          "data": {
            "message": `User role has been changed to ${newRole}`,
            "role": newRole
          }
        }
        console.log(answerResponse)
      } catch (error) {
        console.log({ 'statusCode': 401, 'message': 'Unauthorized' });
      }
    });
  };

  //Conditional return in case the user is deactivated and can't logs in
  if (authorization === false) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 font-bold px-6 py-4 rounded-lg shadow-md text-center max-w-xl mx-auto mt-10">
        {backendErrorMessage}
      </div>
    );
  }
  
  return (
      <>
      {/* Div for main element */}
      <section>
        <div className='container'>
          <div className='main-body'>
            <div className="main-cards">
              <div className='table-view'>
                {/* Div for Table */}
                <div className="mt-4 table-default">
                  <table className="w-100">
                    <thead className="bg-default text-white">
                      <tr>
                        <th className="px-4 py-3" style={{ "width": "50%" }}>Name</th>
                        <th className="px-4 py-3" style={{ "width": "50%" }}>Email</th>
                        <th className="px-4 py-3" style={{ "width": "25%" }}>Active</th>
                        <th className="px-4 py-3" style={{ "width": "25%" }}>Admin</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(() => {
                        
                        return loading ? (
                          <tr>
                            <td colSpan={4} className="text-center py-5">
                              <div className="d-flex justify-content-center align-items-center">
                                <div className="spinner-border text-primary me-2" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                                <span>Loading users...</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                        currentItems.map((person, index) => (
                        <tr
                          key={`${person.id}-${index}`}
                          className="hover:bg-blue-50 transition-colors duration-200 rounded-xl"
                        >
                          <td className="px-4 py-3">{person.username}</td>
                          <td className="px-4 py-3">{person.email}</td>
                          <td className="px-4 py-3">
                            <span className="vertical-middle">
                              <label className="switch switch-slider">
                                <input 
                                  type="checkbox" 
                                  id={`active-${person.id}-${index}`} 
                                  checked={person.status === 'active'} 
                                  disabled={isCurrentUser(person.id)}
                                  onChange={() => handleStatusToggle(index)}
                                  title={isCurrentUser(person.id) ? 'You cannot change your own status' : ''}
                                />
                                <span className={`slider round ${isCurrentUser(person.id) ? 'disabled' : ''}`}></span>
                              </label>
                            </span>
                          </td>
                          <td className="px-4 py-3 flex gap-4">
                            <span className="vertical-middle">
                              <label 
                                className="switch switch-slider"
                                title={
                                  isCurrentUser(person.id) 
                                    ? 'You cannot change your own role' 
                                    : person.status === 'inactive' 
                                    ? 'Cannot change role for inactive users' 
                                    : ''
                                }
                              >
                                <input 
                                  type="checkbox" 
                                  id={`role-${person.id}-${index}`} 
                                  checked={person.role === 'admin'} 
                                  disabled={person.status === 'inactive' || isCurrentUser(person.id)}
                                  onChange={() => handleRoleToggle(index)} 
                                />
                                <span className={`slider round ${person.status === 'inactive' || isCurrentUser(person.id) ? 'disabled' : ''}`}></span>
                              </label>
                            </span>
                          </td>
                        </tr>
                        ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Div for pagination and forward/backward buttons */}
              <div className="d-flex flex-row items-center justify-between gap-4 pt-4 relative">
                <button
                  onClick={handlePrev}
                  disabled={currentPage === 1 || loading}
                   style={{'width': '50px', 'fontSize': '24px'}}
                  className={`btn btn-default border ${currentPage === 1 || loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {/* <img src="./img/angle-left-black-icon.svg" alt='left-icon' /> */}
                  ‹
                </button>

                <div className="d-flex gap-2">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageClick(index)}
                      style={{'width': '50px'}}
                      className={`btn btn-default ${currentPage === index + 1
                        ? 'bg-default text-white'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      disabled={loading}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                {/* Page Selection */}
                <select
                  name="pages" id="pages" value={itemsPerPage} title="please select pages"
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  className="form-control border p-1" style={{'width': '100px'}}
                >
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                  <option value="20">20</option>
                </select>


                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages || loading}
                  style={{'width': '50px'}}
                  className={`btn btn-default border ${currentPage === totalPages || loading ? ' cursor-not-allowed' : ''
                    }`}
                >
                  {/* <img src="./img/angle-right-black-icon.svg" alt='right-icon' /> */}
                  ›
                </button>
              </div>

              
            </div>
          </div>
        </div>
      </section>
      
      {/* Bootstrap Modal */}
      <div className={`modal fade ${showModal ? 'show' : ''}`} style={{ display: showModal ? 'block' : 'none' }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{modalTitle}</h5>
              <button type="button" className="btn-close" onClick={handleModalCancel} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{modalMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleModalCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleModalConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal backdrop */}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </>
    );
};

export default UsersTable;


