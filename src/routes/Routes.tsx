import Dashboard from "../modules/Dashboard/Dashboard";
import { Route, Routes, useLocation } from "react-router";
import UserManagement from "../modules/UserManagement/UserManagement";
import JobList from "../modules/JobManagement/JobList/JobList";
import Reports from "../modules/Reports/Reports";
import BiqicReport from "../modules/Reports/BiqicReport/BiqicReport";
import SystemConfiguration from "../modules/SystemConfiguration/SystemConfiguration";
import Reimbursement from "../modules/Reimbursement/Reimbursement";
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
import EmployeeList from "../modules/AccountManagement/EmployeeList/EmployeeList";
import AddEmployee from "../modules/AccountManagement/AddEmployee/AddEmployee";
import EmployeeOverview from "../modules/AccountManagement/EmployeeOverview/EmployeeOverview";

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
          <ErrorBoundaryWrapper>
            <EmployeeList />
          </ErrorBoundaryWrapper>
        }
      />
      <Route
        path="/add-employee"
        element={
          <ErrorBoundaryWrapper>
            <AddEmployee />
          </ErrorBoundaryWrapper>
        }
      />
      <Route
        path="/employee-overview/:employeeId"
        element={
          <ErrorBoundaryWrapper>
            <EmployeeOverview />
          </ErrorBoundaryWrapper>
        }
      />
      <Route
        path="/reimbursement"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.REIMBURSEMENT.CAN_VIEW]}>
            <ErrorBoundaryWrapper>
              <Reimbursement />
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
