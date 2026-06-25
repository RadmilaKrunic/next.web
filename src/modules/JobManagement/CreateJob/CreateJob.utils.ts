export const getCustomerCollapsedTitle = (values: Record<string, unknown>): string => {
  const customerName =
    (values["firstNameInPri"] as string) ||
    (values["firstName"] as string) ||
    (values["companyName"] as string) ||
    (values["dealershipName"] as string);

  const phone =
    (values["phoneNumber"] as string) ||
    (values["phoneNumberInPri"] as string) ||
    (values["mobileNumber"] as string) ||
    (values["mobileNumberInPri"] as string);

  const email = (values["email"] as string) || (values["emailInPri"] as string);

  const parts = [customerName, phone, email].filter((part) => part && part.trim() !== "");

  return parts.join(" | ");
};

export const getAssetCollapsedTitle = (values: Record<string, unknown>, index: number): string => {
  const toolModelName = values[`assetData#${index}_asset_toolModelName`] as string;
  const baretoolNumber = values[`assetData#${index}_asset_baretoolNumber`] as string;
  const serialNumber = values[`assetData#${index}_asset_serialNumber`] as string;

  const parts = [toolModelName, baretoolNumber, serialNumber].filter(
    (part) => part && part.trim() !== "",
  );

  return parts.join(" | ");
};
