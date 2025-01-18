import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";
import {
  validate,
  validateEmployeeInfos,
} from "../middleware/validation.middleware";

export const employeeRouter = Router();
const employeeController = new EmployeeController();

// GET
// All employees
employeeRouter.get(
  "/",
  validate(validateEmployeeInfos.list),
  employeeController.getEmployees.bind(employeeController)
);

// POST
// create an employee
employeeRouter.post(
  "/",
  validate(validateEmployeeInfos.create),
  employeeController.createEmployee.bind(employeeController)
);

// GET
// one employee
employeeRouter.get(
  "/:id",
  employeeController.getEmployee.bind(employeeController)
);

// PUT
// update employee's info
employeeRouter.put(
  "/:id",
  validate(validateEmployeeInfos.update),
  employeeController.updateEmployee.bind(employeeController)
);

// DELETE
// delete an employee
employeeRouter.delete(
  "/:id",
  employeeController.deleteEmployee.bind(employeeController)
);
