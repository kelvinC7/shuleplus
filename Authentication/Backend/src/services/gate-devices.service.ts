import { attendanceModuleClient } from '../clients/attendance-module.client';
import { prisma } from '../config/database';
import { smartAccessService } from './smart-access.service';

export const gateDevicesService = {
  listSchools(filters?: {
    provinceId?: string;
    districtId?: string;
    sectorId?: string;
    search?: string;
  }) {
    return smartAccessService.listSchools(filters);
  },

  listDevices(organizationId: string) {
    return attendanceModuleClient.listDevices(organizationId);
  },

  async createDevice(
    organizationId: string,
    body: {
      deviceCode?: string;
      name: string;
      location?: string;
      gateName?: string;
      direction?: string;
    }
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, organizationCode: true },
    });

    return attendanceModuleClient.createDevice(organizationId, {
      ...body,
      organizationName: org?.name,
      organizationCode: org?.organizationCode ?? undefined,
    });
  },

  rotateDeviceApiKey(organizationId: string, deviceId: string) {
    return attendanceModuleClient.rotateDeviceApiKey(organizationId, deviceId);
  },

  updateDevice(organizationId: string, deviceId: string, body: Record<string, unknown>) {
    return attendanceModuleClient.updateDevice(organizationId, deviceId, body);
  },

  deleteDevice(organizationId: string, deviceId: string) {
    return attendanceModuleClient.deleteDevice(organizationId, deviceId);
  },
};
