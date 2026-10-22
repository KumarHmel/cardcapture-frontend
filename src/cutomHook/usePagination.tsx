import { useState, useEffect, useCallback } from "react";

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UseServerPaginationProps<T> {
  fetchFunction: (params: any) => Promise<{ data: T[]; pagination: PaginationState }>;
  initialPage?: number;
  initialLimit?: number;
  initialSortBy?: string;
  initialOrder?: 'asc' | 'desc';
}

export function usePagination<T>({
  fetchFunction,
  initialPage = 1,
  initialLimit = 12,
  initialSortBy = 'name',
  initialOrder = 'asc'
}: UseServerPaginationProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialOrder);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination info from server
  const [paginationInfo, setPaginationInfo] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: initialLimit,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        order: sortOrder,
        search: searchTerm
      };
      
      const response = await fetchFunction(params);
      setData(response.data);
      setPaginationInfo(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, fetchFunction]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to first page when search/sort/itemsPerPage changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, sortBy, sortOrder, itemsPerPage]);

  // Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= paginationInfo.totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(paginationInfo.totalPages);
  const goToPreviousPage = () => {
    if (paginationInfo.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };
  const goToNextPage = () => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
  };

  const refresh = () => {
    fetchData();
  };

  return {
    // Data
    data,
    loading,
    error,
    
    // Pagination state
    currentPage,
    totalPages: paginationInfo.totalPages,
    totalItems: paginationInfo.totalItems,
    itemsPerPage,
    hasNextPage: paginationInfo.hasNextPage,
    hasPrevPage: paginationInfo.hasPrevPage,
    
    // Search and sort
    searchTerm,
    sortBy,
    sortOrder,
    
    
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPreviousPage,
    goToNextPage,
    handleSearch,
    handleSort,
    handleItemsPerPageChange,
    refresh,
    
    setCurrentPage,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    setItemsPerPage
  };
}