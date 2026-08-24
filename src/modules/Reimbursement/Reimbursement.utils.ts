import { Breadcrumb } from "@/contexts/breadcrumbscontext";
import { getReimbursementReceipt } from "../../api/services/reimbursements/action";
import { SetStateAction } from "react";
import { Message } from "../../contexts/messagescontext";

export const getInitialFieldValues = (fieldNames: string[]) => {
  const initialValues = fieldNames.reduce(
    (acc, name) => {
      acc[name] = "";
      return acc;
    },
    {} as Record<string, string | boolean>,
  );

  return initialValues;
};

// Date formatting and range helpers
export const formatDateDMY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Convert dd.MM.yyyy format to ISO string for Formik DatePicker
export const convertDMYToISO = (dmyString: string): string => {
  const [day, month, year] = dmyString.split(".");
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  return date.toISOString();
};

function flattenReimbursementForSearch<
  T extends {
    reimbursementId: string;
    ascName: string;
    status: string;
  },
>(reimbursement: T): string[] {
  return [reimbursement.reimbursementId, reimbursement.ascName, reimbursement.status].filter(
    Boolean,
  );
}

export function filterReimbursements<
  T extends {
    reimbursementId: string;
    ascName: string;
    status: string;
  },
>(reimbursements: T[], searchValue: string): T[] {
  if (!searchValue.trim()) return reimbursements;

  const query = searchValue.toLowerCase();
  return reimbursements.filter((reimbursement) => {
    const values = flattenReimbursementForSearch(reimbursement);
    return values.some((v) => v.toLowerCase().includes(query));
  });
}

export const getBreadcrumbsList = (
  page: string,
  translate: (key: string) => string,
  path = "ascList",
  hasPermissionsToViewASC = false,
) => {
  const bread: Breadcrumb[] = [
    {
      label: translate("reimbursement"),
      href: "/ascs",
    },
  ];
  if (page === "Reimbursement") {
    bread.push({
      label: path === "ascList" ? translate("ascList") : translate("reimbursementList"),
      href: "#",
    });
  }
  if (page === "ReimbursementDetail" || page === "ReimbursementClaimsList") {
    if (hasPermissionsToViewASC) {
      bread.push({
        label: translate("ascList"),
        href: "/ascs",
      });
    }

    if (page === "ReimbursementDetail") {
      bread.push({
        label: translate("reimbursementDetail"),
        href: "#",
      });
    }

    if (page === "ReimbursementClaimsList") {
      bread.push({
        label: translate("reimbursementDetail"),
        href: "#",
      });
    }
  }

  if (page === "ReimbursementDetail") {
    if (hasPermissionsToViewASC) {
      bread.push({
        label: translate("ascList"),
        href: "/ascs",
      });
    }
    bread.push({
      label: translate("reimbursementDetail"),
      href: "#",
    });
  }
  return bread;
};

export const handleGenerateReceipt = async (
  reimbursementId: string,
  setMessages: React.Dispatch<SetStateAction<Message[]>>,
  t: (key: string) => string,
  targetWindow: Window | null,
) => {
  const receiptBlob = await getReimbursementReceipt(reimbursementId);
  if (receiptBlob) {
    const pdfUrl = URL.createObjectURL(receiptBlob);
    if (targetWindow) {
      targetWindow.location.href = pdfUrl;
    } else {
      window.open(pdfUrl, "_blank");
    }
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
  } else {
    if (targetWindow) {
      targetWindow.close();
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: t("failedToGenerateReimbursementReceipt"), type: "error", duration: 3000 },
    ]);
  }
};
