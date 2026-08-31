import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { updateUserLanguagePreference, HeaderUserData } from "./action";
export const useUpdateUserLanguagePreference = (
  options?: UseMutationOptions<void, Error, { language: string; locale: string }>,
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { language: string; locale: string }>({
    mutationFn: updateUserLanguagePreference,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      queryClient.setQueryData<HeaderUserData | undefined>(["user"], (currentUser) => {
        if (!currentUser) return currentUser;

        return {
          ...currentUser,
          language: variables.language,
          locale: variables.locale,
        };
      });

      await queryClient.invalidateQueries({ queryKey: ["user"] });

      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
};
