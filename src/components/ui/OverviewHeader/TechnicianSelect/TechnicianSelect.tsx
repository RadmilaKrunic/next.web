import { Dropdown } from "@bosch/react-frok";
import { useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchUsersByAscId } from "api/services/users/action";
import { updateJobAssignee } from "api/services/jobs/action";
import { AscUser } from "types/user.type";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { MessagesContext } from "contexts/messagescontext";

export default function TechnicianSelect({
  assigneeName,
  ascId,
  jobId,
  disabled = false,
}: Readonly<{
  assigneeName: string;
  ascId: string;
  jobId: string;
  disabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<AscUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(assigneeName);
  const [hasChangedAssignee, setHasChangedAssignee] = useState(false);
  const { setMessages } = useContext(MessagesContext);

  useEffect(() => {
    const loadUsers = async () => {
      if (!ascId) return;

      setIsLoading(true);
      try {
        const fetchedUsers = await queryClient.fetchQuery({
          queryKey: ["asc-users", ascId],
          queryFn: () => fetchUsersByAscId(ascId),
          staleTime: DEFAULT_STALE_TIME_MS,
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [ascId, queryClient]);

  useEffect(() => {
    if (!hasChangedAssignee) {
      setSelectedAssignee(assigneeName);
    }
  }, [assigneeName, hasChangedAssignee]);

  const technicianOptions = useMemo(() => {
    const options = users.map((user) => {
      const fullName = `${user.firstName} ${user.lastName}`;
      return {
        value: user.userId,
        name: fullName,
        label: fullName,
        key: `technician-${user.userId}`,
      };
    });
    if (selectedAssignee === "un-assigned") {
      return [
        {
          value: "",
          name: t("un-assigned"),
          label: t("un-assigned"),
          key: "technician-unassigned",
        },
        ...options,
      ];
    } else if (!hasChangedAssignee) {
      const optionsWithoutCurrent = options.filter((option) => option.label !== selectedAssignee);
      return [
        {
          value: "",
          name: selectedAssignee,
          label: selectedAssignee,
          key: "technician-unassigned",
        },
        ...optionsWithoutCurrent,
      ];
    }
    return options;
  }, [users, selectedAssignee, hasChangedAssignee, t]);

  const handleTechnicianChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const selectedUser = users.find((user) => user.userId === selectedUserId);

    if (selectedUser) {
      const fullName = `${selectedUser.firstName} ${selectedUser.lastName}`;
      setSelectedAssignee(fullName);
      setHasChangedAssignee(true);

      updateJobAssignee(jobId, selectedUser.userId, fullName)
        .then(() => {
          setHasChangedAssignee(false);
          void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
          void queryClient.invalidateQueries({ queryKey: ["jobs"] });
          void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
          setMessages((prev) => [
            ...prev,
            { text: t("successAssigneeUpdated"), type: "success", duration: 2000 },
          ]);
        })
        .catch(() => {
          setMessages((prev) => [
            ...prev,
            { text: t("errorUpdateAssignee"), type: "error", duration: 2000 },
          ]);
          setSelectedAssignee(assigneeName);
        });
    }
  };

  const currentValue = useMemo(() => {
    if (selectedAssignee === "un-assigned") {
      return "";
    }
    return users.find((u) => `${u.firstName} ${u.lastName}` === selectedAssignee)?.userId || "";
  }, [selectedAssignee, users]);

  return (
    <Dropdown
      label={t("technician")}
      className={`a-dropdown`}
      onChange={handleTechnicianChange}
      value={currentValue}
      options={technicianOptions}
      disabled={disabled || isLoading || technicianOptions.length === 0}
    />
  );
}
