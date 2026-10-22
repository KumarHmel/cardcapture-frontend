import  { useState, useEffect } from 'react'
import { useUtility } from '../../context/utility.context'
import apiService from '../../service/apiService'
 

interface User {
  id: number;
  name: string[];
  email: string[];
  phone: string[];
  address: string[];
  company: string;
  jobTitle: string;
}

export default function Modal() {
  const { isOpen, closeModal, cardDetails, setCardDetails, isEditMode, setIsEditMode } = useUtility()
  
  const [editableData, setEditableData] = useState<User>({
    id: 0,
    name: [''],
    email: [''],
    phone: [''],
    address: [''],
    company: '',
    jobTitle: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})

  // Update editable data when cardDetails changes
  useEffect(() => {
    if (cardDetails && isOpen) {
      const transformedData = {
        id: cardDetails.id || 0,
        name: Array.isArray(cardDetails.name) ? cardDetails.name : [cardDetails.name || ''],
        email: Array.isArray(cardDetails.email) ? cardDetails.email : [cardDetails.email || ''],
        phone: Array.isArray(cardDetails.phone) ? cardDetails.phone : [cardDetails.phone || ''],
        address: Array.isArray(cardDetails.address) ? cardDetails.address : [cardDetails.address || ''],
        company: cardDetails.company || '',
        jobTitle: cardDetails.jobTitle || '',
      };
      
      setEditableData(transformedData);
      
      
    }
  }, [cardDetails, isOpen, isEditMode])

  const handleModal = () => {
    setCardDetails({})
    setIsEditMode(false)
    setErrors({})
    closeModal()
  }

  const handleInputChange = (field: keyof User, value: string) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: []
      }))
    }
  }

  const handleArrayInputChange = (field: 'name' | 'email' | 'phone' | 'address', index: number, value: string) => {
    setEditableData(prev => {
      const newArray = [...prev[field]]
      newArray[index] = value
      return {
        ...prev,
        [field]: newArray
      }
    })
    
    // Clear error for this field and index when user starts typing
    if (errors[field] && errors[field][index]) {
      setErrors(prev => ({
        ...prev,
        [field]: prev[field]?.map((error, i) => i === index ? '' : error) || []
      }))
    }
  }

  const addArrayField = (field: 'name' | 'email' | 'phone' | 'address') => {
    setEditableData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayField = (field: 'name' | 'email' | 'phone' | 'address', index: number) => {
    if (editableData[field].length > 1) {
      setEditableData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
      
      // Remove error for this index
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: prev[field]?.filter((_, i) => i !== index) || []
        }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string[] } = {}
    
    // Validate name array
    const nameErrors: string[] = []
    editableData.name.forEach((name, index) => {
      if (!name.trim()) {
        nameErrors[index] = 'Name is required'
      }
    })
    if (nameErrors.some(error => error)) {
      newErrors.name = nameErrors
    }
    
    // Validate email array
    const emailErrors: string[] = []
    editableData.email.forEach((email, index) => {
      if (!email.trim()) {
        emailErrors[index] = 'Email is required'
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        emailErrors[index] = 'Email is invalid'
      }
    })
    if (emailErrors.some(error => error)) {
      newErrors.email = emailErrors
    }
    
    // Validate phone array
    const phoneErrors: string[] = []
    editableData.phone.forEach((phone, index) => {
      if (!phone.trim()) {
        phoneErrors[index] = 'Phone is required'
      }
    })
    if (phoneErrors.some(error => error)) {
      newErrors.phone = phoneErrors
    }
    
    if (!editableData.company.trim()) {
      newErrors.company = ['Company is required']
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const updateObj = {
        name: editableData.name,
        email: editableData.email,
        phoneNumber: editableData.phone,
        address: editableData.address,
        company: editableData.company,
        jobTitle: editableData.jobTitle,
      }
      
      const resp = await apiService.editCard(editableData.id, updateObj)
      
      if (resp.success || resp.status === 'success') {
        // Update the cardDetails with new data
        setCardDetails(editableData)
        setIsEditMode(false)
        alert('User updated successfully!')
      } else {
        alert('Failed to update user. Please try again.')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  

  const handleCancel = () => {
    // Reset to original data
    setEditableData({
      id: cardDetails.id || 0,
      name: Array.isArray(cardDetails.name) ? cardDetails.name : [cardDetails.name || ''],
      email: Array.isArray(cardDetails.email) ? cardDetails.email : [cardDetails.email || ''],
      phone: Array.isArray(cardDetails.phone) ? cardDetails.phone : [cardDetails.phone || ''],
      address: Array.isArray(cardDetails.address) ? cardDetails.address : [cardDetails.address || ''],
      company: cardDetails.company || '',
      jobTitle: cardDetails.jobTitle || '',
    })
    setIsEditMode(false)
    setErrors({})
  }

  const renderArrayField = (
    field: 'name' | 'email' | 'phone' | 'address',
    label: string,
    type: string = 'text',
    isTextarea: boolean = false
  ) => {
    return (
      <div className="col-6 mb-3">
        <strong>{label}</strong>
        {isEditMode ? (
          <div>
            {editableData[field].map((value, index) => (
              <div key={index} className="d-flex align-items-start gap-2 mb-2">
                {isTextarea ? (
                  <textarea
                    className={`form-control ${errors[field]?.[index] ? 'is-invalid' : ''}`}
                    value={value}
                    onChange={(e) => handleArrayInputChange(field, index, e.target.value)}
                    rows={2}
                    style={{ resize: 'vertical', flex: 1, minHeight: '6.5rem' }}
                  />
                ) : (
                  <input
                    type={type}
                    className={`form-control ${errors[field]?.[index] ? 'is-invalid' : ''}`}
                    value={value}
                    onChange={(e) => handleArrayInputChange(field, index, e.target.value)}
                    placeholder={type === 'url' ? 'https://www.example.com' : ''}
                    style={{ flex: 1 }}
                  />
                )}
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={() => addArrayField(field)}
                  style={{ minWidth: '32px' }}
                >
                  +
                </button>
                {editableData[field].length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeArrayField(field, index)}
                    style={{ minWidth: '32px' }}
                  >
                    -
                  </button>
                )}
                {errors[field]?.[index] && (
                  <div className="invalid-feedback d-block" style={{ fontSize: '0.8rem', width: '100%', marginTop: '4px' }}>
                    {errors[field][index]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#0d74f0' }}>
            {Array.isArray(cardDetails[field]) 
              ? cardDetails[field].map((item: string, index: number) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {item}
                  </div>
                ))
              : (cardDetails[field])
            }
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) {
    return null;
  }

  return (
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
      onClick={!isEditMode ? handleModal : undefined}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        role="document"
        style={{ 
          maxWidth: '600px', 
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
          backgroundColor: '#ffffff',
          minHeight: '500px',
          position: 'relative'
        }}>
          <div className="modal-header" style={{ 
            borderBottom: '2px solid #e9ecef', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingBottom: '15px',
            marginBottom: '20px'
          }}>
            <h5 className="modal-title" style={{ 
              fontWeight: 'bold',
              fontSize: '1.25rem',
              color: '#333',
              margin: 0
            }}>
              {isEditMode ? 'Edit User Information' : 'User Information'}
            </h5>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              
              <button 
                type="button" 
                className="btn-close" 
                aria-label="Close" 
                onClick={handleModal}
                style={{
                  background: '#f8f9fa',
                  border: '2px solid #dee2e6',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#6c757d',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#dc3545';
                  e.currentTarget.style.borderColor = '#dc3545';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#dee2e6';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', justifyItems: 'center', marginBottom: '1rem' }}>
            <img
              src="/img/avtar.jpg"
              alt="user"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #ddd',
              }}
            />
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <div className="modal-body" style={{ paddingTop: 0 }}>
            <div className="row" style={{ fontSize: '0.95rem' }}>
              {renderArrayField('name', 'Name')}
              
              <div className="col-6 mb-3">
                <strong>Designation</strong>
                {isEditMode ? (
                  <input
                    type="text"
                    className="form-control"
                    value={editableData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    style={{ marginTop: '5px' }}
                  />
                ) : (
                  <div style={{ color: '#0d74f0' }}>{cardDetails.jobTitle}</div>
                )}
              </div>

              {renderArrayField('email', 'Email', 'email')}
              {renderArrayField('phone', 'Phone')}
              {renderArrayField('address', 'Address', 'text', true)}
              
              <div className="col-6 mb-3">
                <strong>Company</strong>
                {isEditMode ? (
                  <div>
                    <input
                      type="text"
                      className={`form-control ${Array.isArray(errors.company) && errors.company[0] ? 'is-invalid' : ''}`}
                      value={editableData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      style={{ marginTop: '5px' }}
                    />
                    {Array.isArray(errors.company) && errors.company[0] && (
                      <div className="invalid-feedback">{errors.company[0]}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#0d74f0' }}>{cardDetails.company}</div>
                )}
              </div>
            </div>

            {isEditMode && (
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show"
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9998
        }}
      ></div>
    </div>
  )
}