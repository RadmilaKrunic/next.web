import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { postConsentAccept } from "./action";
import { ConsentAcceptPayload } from "./consent.types";
import { HeaderUserData } from "../header/action";

export const useAcceptConsent = (
  options?: UseMutationOptions<void, Error, ConsentAcceptPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postConsentAccept,
    onSuccess: (...args) => {
      queryClient.setQueryData<HeaderUserData>(["user"], (prev) =>
        prev?.consent
          ? { ...prev, consent: { ...prev.consent, isConsentUpdateRequired: false } }
          : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ["user"] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
};
