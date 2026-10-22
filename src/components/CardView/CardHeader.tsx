import { useEffect, useState, useRef } from "react";
import { useUtility } from "../../context/utility.context";
import Card from "./Card";
import apiService from "../../service/apiService";


export default function CardHeader() {
  const { myCardRecords, allCardRecords, setOrder, setSortBy, setMycardRecords, setAllcardRecords, itemsPerPage, currentPage, sortBy, order } = useUtility();
  const [dropdown, setDropDown] = useState(false);
  const [orderDropdown, setOrderDropdown] = useState(false);
  const [sortByDropdown, setSortByDropdown] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [selectedSortBy, setSelectedSortBy] = useState("");
  
  // Check if user has cards - handle both array and object structures
  const getMyCardsArray = () => {
    if (!myCardRecords) return [];
    if (Array.isArray(myCardRecords)) return myCardRecords;
    const records = myCardRecords as any;
    if (records.mycards && Array.isArray(records.mycards)) return records.mycards;
    if (records.allcards && Array.isArray(records.allcards)) return records.allcards;
    return [];
  };
  
  const hasMyCards = getMyCardsArray().length > 0;
  const [activeTab, setActiveTab] = useState<"myCard" | "allCard">("myCard");
  const [hasInitialized, setHasInitialized] = useState(false);
  const allCardsRefreshAttempted = useRef(false);

  // Automatically switch tabs based on whether user has cards (applies to both admin and non-admin)
  useEffect(() => {
    if (!hasInitialized && myCardRecords !== null && myCardRecords !== undefined) {
      // First time data is loaded - set initial tab
      if (hasMyCards) {
        setActiveTab("myCard");
      } else {
        setActiveTab("allCard");
        // Ensure All Cards data is loaded when switching to it
        refreshAllCards();
      }
      setHasInitialized(true);
    } else if (hasInitialized) {
      // After initialization, force switch to allCard if no mycards (prevents overlap)
      if (!hasMyCards) {
        if (activeTab === "myCard") {
          setActiveTab("allCard");
          // Ensure All Cards data is loaded when switching to it
          refreshAllCards();
        }
      }
    }
  }, [hasMyCards, activeTab, myCardRecords, hasInitialized]);

  // Fetch data whenever active tab or relevant sorting/pagination changes
  useEffect(() => {
    const loadData = async () => {
      if (activeTab === "myCard") {
        // Only load My Cards if initialized (to avoid duplicate calls on mount)
        if (hasInitialized) {
          await refreshMyCards();
        }
      } else {
        // Always refresh All Cards when tab is active to ensure data is loaded
        // This is important for non-admin users with no mycards
        await refreshAllCards();
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortBy, order, itemsPerPage, currentPage, hasInitialized]);
  
  // Also ensure All Cards data is available when tab is "allCard" and data might be missing
  useEffect(() => {
    if (activeTab === "allCard" && hasInitialized) {
      // Check if allCardRecords is empty or undefined
      const getAllCardsArray = () => {
        if (!allCardRecords) return [];
        if (Array.isArray(allCardRecords)) return allCardRecords;
        const records = allCardRecords as any;
        if (records.allcards && Array.isArray(records.allcards)) return records.allcards;
        if (records.mycards && Array.isArray(records.mycards)) return records.mycards;
        return [];
      };
      
      const cardsArray = getAllCardsArray();
      // If no cards data and we haven't attempted refresh yet, refresh it
      // Reset the flag when switching tabs to allow refresh on next switch
      if (activeTab === "allCard") {
        if (cardsArray.length === 0 && !allCardsRefreshAttempted.current) {
          allCardsRefreshAttempted.current = true;
          refreshAllCards();
        }
      } else {
        // Reset flag when not on allCard tab
        allCardsRefreshAttempted.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, allCardRecords, hasInitialized]);

  const handleOrderSelect = (order: string) => {
    if (order === "reset") {
      setSelectedOrder("asc");
      setOrder("asc"); 
    } else {
      setSelectedOrder(order);
      setOrder(order);
    }
    setOrderDropdown(false);
  };

  const handleSortBySelect = (sortBy: string) => {
    if (sortBy === "reset") {
      setSelectedSortBy("name");
      setSortBy("name"); 
    } else {
      setSelectedSortBy(sortBy);
      setSortBy(sortBy);
    }
    setSortByDropdown(false);
  };

  // Refresh functions for tab content
  const refreshMyCards = async () => {
    try {
      const myCardData = await apiService.myCards(sortBy, order, itemsPerPage.toString(), currentPage.toString(), "");
      setMycardRecords(myCardData);
    } catch (error) {
      console.error("Error refreshing My Cards:", error);
    }
  };

  const refreshAllCards = async () => {
    try {
      const allCardData = await apiService.allcards(sortBy, order, itemsPerPage.toString(), currentPage.toString(), "");
      setAllcardRecords(allCardData);
    } catch (error) {
      console.error("Error refreshing All Cards:", error);
    }
  };

  const toggleFilterDropdown = () => {
    setDropDown(prev => !prev);
   
    if (dropdown) {
      setOrderDropdown(false);
      setSortByDropdown(false);
    }
  };

  return (
    <div>
 
      <div className="main-cards-header mb-3">
        <div className="d-flex flex-row justify-content-between align-items-center">
          <h1>All Users Detail</h1>
          <ul className="main-cards-header-list">
            {hasMyCards && (
              <li>
                <button
                  className={`btn btn-default ${
                    activeTab === "myCard" ? "active" : ""
                  }`}
                  style={{ display: "flex", alignItems: "center" }}
                  onClick={() => {
                    setActiveTab("myCard");
                  }}
                >
                  <img
                    src="img/user-icon.svg"
                    alt="my"
                    style={{ width: "20px", height: "20px" }}
                  />
                  <span style={{ marginLeft: "8px" }}>My Card</span>
                </button>
              </li>
            )}
            <li>
              <button
                className={`btn btn-default ${
                  activeTab === "allCard" ? "active" : ""
                }`}
                style={{ display: "flex", alignItems: "center" }}
                onClick={() => {
                  setActiveTab("allCard");
                }}
              >
                <img
                  src="/img/contacts-icon.svg"
                  alt="contacts"
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ marginLeft: "8px" }}>All Cards</span>
              </button>
            </li>

            <li style={{ position: "relative" }}>
              <button className="btn btn-default" onClick={toggleFilterDropdown}>
                <img src="img/filter-icon.svg" alt="filter" />
              </button>

              {/* Main Filter Dropdown */}
              {dropdown && (
                <div 
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: "0",
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                    minWidth: "120px"
                  }}
                  onMouseLeave={toggleFilterDropdown}
                >
                  {/* Order Option */}
                  <div style={{ position: "relative" }}>
                    <button
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        backgroundColor: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onClick={() => setOrderDropdown(prev => !prev)}
                      onMouseEnter={() => {
                        setOrderDropdown(true);
                        setSortByDropdown(false);
                      }}
                    >
                      Order {selectedOrder && `(${selectedOrder})`}
                      <span>▶</span>
                    </button>

                    {/* Order Sub-dropdown */}
                    {orderDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0",
                          left: "100%",
                          backgroundColor: "white",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                          minWidth: "100px",
                          zIndex: 1001
                        }}
                        onMouseLeave={() => setOrderDropdown(false)}
                      >
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: selectedOrder === "asc" ? "#f0f0f0" : "transparent",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                          onClick={() => handleOrderSelect("asc")}
                        >
                          Ascending
                        </button>
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: selectedOrder === "desc" ? "#f0f0f0" : "transparent",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                          onClick={() => handleOrderSelect("desc")}
                        >
                          Descending
                        </button>
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                            borderTop: "1px solid #eee",
                            color: "#666"
                          }}
                          onClick={() => handleOrderSelect("reset")}
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sort By Option */}
                  <div style={{ position: "relative", borderTop: "1px solid #eee" }}>
                    <button
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        backgroundColor: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onClick={() => setSortByDropdown(prev => !prev)}
                      onMouseEnter={() => {
                        setSortByDropdown(true);
                        setOrderDropdown(false);
                      }}
                    >
                      Sort By {selectedSortBy && `(${selectedSortBy})`}
                      <span>▶</span>
                    </button>

                    {/* Sort By Sub-dropdown */}
                    {sortByDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0",
                          left: "100%",
                          backgroundColor: "white",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                          minWidth: "100px",
                          zIndex: 1002
                        }}
                        onMouseLeave={() => setSortByDropdown(false)}
                      >
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: selectedSortBy === "name" ? "#f0f0f0" : "transparent",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                          onClick={() => handleSortBySelect("name")}
                        >
                          Name
                        </button>
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: selectedSortBy === "email" ? "#f0f0f0" : "transparent",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                          onClick={() => handleSortBySelect("email")}
                        >
                          Email
                        </button>
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: selectedSortBy === "company" ? "#f0f0f0" : "transparent",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                          onClick={() => handleSortBySelect("company")}
                        >
                          Company
                        </button>
                        <button
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            backgroundColor: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                            borderTop: "1px solid #eee",
                            color: "#666"
                          }}
                          onClick={() => handleSortBySelect("reset")}
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* Card rendering */}
      {/* Only render My Cards if user has cards and tab is active, otherwise always show All Cards */}
      <Card 
        records={hasMyCards && activeTab === "myCard" ? myCardRecords : allCardRecords} 
        cardType={hasMyCards && activeTab === "myCard" ? "mycards" : "allcards"} 
      />
    </div>
  );
}
