// src/test/sin.fixture.ts
import { DataSource } from "typeorm";
import { EmployeeSIN, SINAccessLevel } from "@/entities/EmployeeSIN";
import { SINService } from "@/features/sinEncryption/service/sin.service";

export const mockSINData = {
  sinNumber: "046454286",
  accessLevel: SINAccessLevel.EMPLOYEE,
};

export const createTestSINRaw = async (
  dataSource: DataSource,
  employeeId: number
): Promise<EmployeeSIN> => {
  const sinService = new SINService(dataSource);
  return await sinService.saveSIN(employeeId, mockSINData.sinNumber);
};
