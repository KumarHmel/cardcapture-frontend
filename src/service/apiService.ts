import axiosInstance, { refreshTokenUtils } from "../utils/axiosInstance";
import Cookies from 'js-cookie';


class ApiService {
 public async myCards(
  sortBy: string,
  order: string,
  limit: string,
  page: string,
  search: string
): Promise<any> {

  
  try {
    const mycardResponse = await axiosInstance.get("/mycards", {
      params: {
        sortBy,
        order,
        limit,
        page,
        search
      }
    });


    return mycardResponse.data.data;
  } catch (error) {
    console.error("API Service: myCards error:", error);
    throw error;
  }
}

  public async allcards( sortBy: string,
  order: string,
  limit: string,
  page: string,
  search: string
): Promise<any> {
    
    try {
      const allcardResponse=await axiosInstance.get("/allcards",{
        params: {
        sortBy,
        order,
        limit,
        page,
        search
      }
      })
      return allcardResponse.data.data
    } catch (error) {
      console.error("API Service: allcards error:", error);
      throw error;
    }
  }
  public async deleteCard(id:number):Promise<any>{
    const deleteCardResponse=await axiosInstance.delete(`/delete-card/${id}`)
    return deleteCardResponse.data
  }

 
  public async editCard(id:number,user:object):Promise<any>{
    const editCardResponse=await axiosInstance.patch(`/update-card/${id}`, user
  
)
    return editCardResponse.data
  }

  public async visibility(obj:object):Promise<any>{
    const visibilityResponse=await axiosInstance.post(`/card/visibility`,obj)
    return visibilityResponse.data
  }

  public async refreshToken(): Promise<any> {
    const result = await refreshTokenUtils.refreshToken();
    return { data: result };
}

  public async logout():Promise<any>{
    const refreshToken = Cookies.get('refreshToken');
    const logoutResponse=await axiosInstance.post(`/logout`, {
      refreshToken: refreshToken
    })
    return logoutResponse.data
  }

  // User Management API methods
  public async getAllUsers(
    page: number = 1,
    limit: number = 8,
    status?: string,
    role?: string,
    search?: string,
    sortBy: string = 'email',
    order: string = 'asc'
  ): Promise<any> {
    try {
      const params: any = {
        page,
        limit,
        sortBy,
        order
      };
      
      if (status) params.status = status;
      if (role) params.role = role;
      if (search) params.search = search;
      
      const response = await axiosInstance.get('/admin/users', { params });
      return response.data.data;
    } catch (error) {
      console.error("API Service: getAllUsers error:", error);
      throw error;
    }
  }

  public async getUserById(id: number): Promise<any> {
    try {
      const response = await axiosInstance.get(`/admin/users/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`API Service: getUserById error for ID ${id}:`, error);
      throw error;
    }
  }

  public async updateUserStatus(userId: number, action: string): Promise<any> {
    try {
      const response = await axiosInstance.patch(`/admin/${userId}/status`, { action });
      return response.data;
    } catch (error) {
      console.error(`API Service: updateUserStatus error for user ${userId}:`, error);
      throw error;
    }
  }

  public async updateUserRole(userId: number, action: string): Promise<any> {
    try {
      const response = await axiosInstance.patch(`/admin/${userId}/role`, { action });
      return response.data;
    } catch (error) {
      console.error(`API Service: updateUserRole error for user ${userId}:`, error);
      throw error;
    }
  }

  public async getProfile(): Promise<any> {
    try {
      const response = await axiosInstance.get('/profile');
      return response.data.data || response.data;
    } catch (error) {
      console.error("API Service: getProfile error:", error);
      throw error;
    }
  }

  public async updateProfile(profileData: object): Promise<any> {
    try {
      const response = await axiosInstance.post('/profile', profileData);
      return response.data.data || response.data;
    } catch (error) {
      console.error("API Service: updateProfile error:", error);
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;
