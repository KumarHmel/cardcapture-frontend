import { useEffect, useState } from 'react';
import Contacts from './Contacts';
import { useUtility } from '../../context/utility.context';
import apiService from '../../service/apiService';
import { useNetworkStatus } from '../../cutomHook/useNetworkStatus';
// import { useRefreshToken } from '../../cutomHook/useRefreshToken';

export default function Dashboard() {

  const { setMycardRecords, setAllcardRecords } = useUtility();
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useNetworkStatus();
  //const refreshTokenUtils = useRefreshToken();

  useEffect(() => {
    const initializeData = async () => {
      // Don't make API calls if offline
      if (!isOnline) {
        console.log("Skipping API calls - network offline");
        setIsLoading(false);
        return;
      }
      
      try {
        // Load myCards for all users
        
        const myCardData = await apiService.myCards("name", "asc", "12", "1", "");
        setMycardRecords(myCardData);

        // Load allCards for all users
        const allCardData = await apiService.allcards("name", "asc", "12", "1", "");
        setAllcardRecords(allCardData);
      } catch (error) {
        console.error("Error in Dashboard API calls:", error);
      }
      
      setIsLoading(false);
    };

    initializeData();
  }, [isOnline]); // Add isOnline dependency to retry when network comes back

  if (isLoading) {
    return (
      <section>
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading dashboard...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isOnline) {
    return (
      <section>
        <div className="container">
          <div className="text-center py-5">
            <div className="alert alert-warning" role="alert">
              <h4 className="alert-heading">Network Offline</h4>
              <p>You are currently offline. Please check your internet connection.</p>
              <hr />
              <p className="mb-0">The dashboard will automatically refresh when you're back online.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="container">
        <div className="main-body">
          <div className="tab-content" id="mainTabContent">
            <Contacts />
          </div>
        </div>
      </div>
    </section>
  );
}