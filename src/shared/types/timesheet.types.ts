// DTO for creating Timesheet
export interface CreateTimesheetDto {
  employeeId: number;
  startTime: Date;
  endTime: Date;
  regularHours: number;
  overtimeHours?: number;
}

// DTO for updating Timesheet
export interface UpdateTimesheetDto {
  startTime?: Date;
  endTime?: Date;
  regularHours?: number;
  overtimeHours?: number;
}

// Response type for Timesheet
export interface TimesheetResponse {
  id: number;
  employeeId: number;
  startTime: Date;
  endTime: Date;
  totalHours: number;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

// Filter options for Timesheet
export interface TimesheetFilters {
  employeeId?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// Paginated Timesheet list response
export interface PaginatedTimesheetResponse {
  data: TimesheetResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
