// src/api/endpoints/brokers.ts — unified broker endpoints
import { apiClient } from "@/api/client";
import type { AllBrokersConnectionsResponse, DeleteConnectionResponse } from "@/types/broker";

export const allBrokersApi = {
  /** GET /brokers/connections — all broker connections in a single call */
  listAllConnections: async (): Promise<AllBrokersConnectionsResponse> => {
    const { data } = await apiClient.get<AllBrokersConnectionsResponse>("/brokers/connections");
    return data;
  },

  /** DELETE /brokers/{brokerId}/connections/{connectionId} */
  deleteConnection: async (brokerId: string, connectionId: string): Promise<DeleteConnectionResponse> => {
    const { data } = await apiClient.delete<DeleteConnectionResponse>(
      `/brokers/${brokerId}/connections/${connectionId}`
    );
    return data;
  },
};
