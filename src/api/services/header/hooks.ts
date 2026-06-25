import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { updateUserLanguagePreference } from "./action";

export const useUpdateUserLanguagePreference = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  return useMutation<void, Error, string>({
    mutationFn: updateUserLanguagePreference,
    ...options,
  });
};
