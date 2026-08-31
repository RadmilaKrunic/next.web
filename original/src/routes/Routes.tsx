import Dashboard from "../modules/Dashboard/Dashboard";
import { Route, Routes, useLocation } from "react-router";
import UserManagement from "../modules/UserManagement/UserManagement";
import JobList from "../modules/JobManagement/JobList/JobList";
import Reports from "../modules/Reports/Reports";
import BiqicReport from "../modules/Reports/BiqicReport/BiqicReport";
import SystemConfiguration from "../modules/SystemConfiguration/SystemConfiguration";
import Reimbursement from "../modules/Reimbursement/Reimbursement";
import ReimbursementDetail from "../modules/Reimbursement/ReimbursementDetail/ReimbursementDetail";
import ReimbursementClaimsList from "../modules/Reimbursement/ReimbursementClaimsList/ReimbursementClaimsList";
import Clients from "../modules/Clients/Clients";
import ClaimManagement from "../modules/ClaimManagement/ClaimManagement";
import ApprovalList from "../modules/ClaimManagement/ApprovalList/ApprovalList";
import CreateJob from "../modules/JobManagement/CreateJob/CreateJob";
import JobOverview from "../modules/JobManagement/JobOverview/JobOverview";
import NotFound from "./NotFound/NotFound";
import { ErrorBoundary } from "react-error-boundary";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import ClaimOverview from "modules/ClaimManagement/ClaimOverview/ClaimOverview";
import EmployeeList from "../modules/AccountManagement/Employees/EmployeeList/EmployeeList";
import AddEmployee from "../modules/AccountManagement/Employees/AddEmployee/AddEmployee";
import EmployeeOverview from "../modules/AccountManagement/Employees/EmployeeOverview/EmployeeOverview";
import AddASC from "../modules/AccountManagement/ASC/AddAsc/AddASC";
import AscList from "../modules/AccountManagement/ASC/ASCList/AscList";
import AscOverview from "../modules/AccountManagement/ASC/AscOverview/AscOverview";
import CreateReimbursement from "../modules/Reimbursement/CreateReimbursement/CreateReimbursement";

const ErrorFallback = () => <div>Something went wrong.</div>;

const ErrorBoundaryWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} key={location.pathname}>
      {children}
    </ErrorBoundary>
  );
};

const ProtectedRoute = ({
  children,
  requiredPermissions,
}: {
  children: React.ReactNode;
  requiredPermissions?: string[];
}) => {
  const hasPermission = useHasPermission(requiredPermissions);
  if (!hasPermission) {
    return <div>You do not have permission to view this page.</div>;
  }
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <ErrorBoundaryWrapper>
            <Dashboard />
          </ErrorBoundaryWrapper>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ErrorBoundaryWrapper>
            <Dashboard />
          </ErrorBoundaryWrapper>
        }
      />
      <Route
        path="/job-list"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ORDER.CAN_VIEW_TABLE]}>
            <ErrorBoundaryWrapper>
              <JobList />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-job"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ORDER.CAN_CREATE]}>
            <ErrorBoundaryWrapper>
              <CreateJob />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-order/:orderId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ORDER.CAN_EDIT]}>
            <ErrorBoundaryWrapper>
              <CreateJob />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-overview/:jobId"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.ORDER.CAN_VIEW,
              PERMISSIONS.ORDER.CAN_VIEW_TABLE,
              PERMISSIONS.ORDER.CAN_EDIT,
              PERMISSIONS.ORDER.CAN_CREATE,
            ]}
          >
            <ErrorBoundaryWrapper>
              <JobOverview />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REPORTS.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <Reports />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/biqic-report"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REPORT.CAN_CREATE_BIQIC]}>
            <ErrorBoundaryWrapper>
              <BiqicReport />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.CLIENT.CAN_VIEW_LIST]}>
            <ErrorBoundaryWrapper>
              <Clients />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-list"
        element={
          <ProtectedRoute
            requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_EMPLOYEE_LIST]}
          >
            <ErrorBoundaryWrapper>
              <EmployeeList />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-employee"
        element={
          <ProtectedRoute
            requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_EMPLOYEE_LIST]}
          >
            <ErrorBoundaryWrapper>
              <AddEmployee />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-overview/:employeeId"
        element={
          <ProtectedRoute
            requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_EMPLOYEE_LIST]}
          >
            <ErrorBoundaryWrapper>
              <EmployeeOverview />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/asc-profiles"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_PROFILES]}>
            <ErrorBoundaryWrapper>
              <AscList />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-asc"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ACCESS.CAN_ACCESS_ASC_GLOBALLY]}>
            <ErrorBoundaryWrapper>
              <AddASC />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-asc/:ascId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_PROFILES]}>
            <ErrorBoundaryWrapper>
              <AddASC />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/asc-overview/:ascId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_PROFILES]}>
            <ErrorBoundaryWrapper>
              <AscOverview />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/asc-profile"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.ACCOUNT_MANAGEMENT.CAN_VIEW_PROFILE]}>
            <ErrorBoundaryWrapper>
              <AscOverview />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reimbursement"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW_ASC_LIST_TABLE]}>
            <ErrorBoundaryWrapper>
              <Reimbursement />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reimbursement-detail/:ascId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW_ASC_LIST_TABLE]}>
            <ErrorBoundaryWrapper>
              <ReimbursementDetail />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reimbursements"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <ReimbursementDetail />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-reimbursement"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW_ASC_LIST_TABLE]}>
            <ErrorBoundaryWrapper>
              <CreateReimbursement />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reimbursement-claims/:reimbursementId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <ReimbursementClaimsList />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/system-configuration"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.SYSTEM_SETTINGS.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <SystemConfiguration />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_MANAGEMENT.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <UserManagement />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claim-list"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.CLAIM.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <ClaimManagement />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claim-overview/:claimId"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.CLAIM.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <ClaimOverview />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approval-list"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.APPROVAL.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <ApprovalList />
            </ErrorBoundaryWrapper>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
