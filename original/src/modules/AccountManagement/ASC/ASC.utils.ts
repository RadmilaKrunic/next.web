import {
  ReimbursementConfiguration,
  ServiceCenter,
} from "../../../api/services/serviceCenters/serviceCenters.types";

export const mapGeneralInfo = (generalInfo: Record<string, any>) => {
  const generalInfoData: Record<string, unknown> = {};
  generalInfoData.name = generalInfo.name;
  generalInfoData.email = generalInfo.email;
  generalInfoData.phoneNumber = generalInfo.phoneNumber;
  generalInfoData.gst = generalInfo.gst;
  generalInfoData.companyVATNumber = generalInfo.companyVATNumber;
  generalInfoData.isActive = generalInfo.isActive;
  generalInfoData.address = {
    street: generalInfo.streetName,
    houseNumber: generalInfo.houseNumber,
    city: generalInfo.city,
    stateProvinceRegion: generalInfo.state,
    postalCode: generalInfo.postalCode,
    countryCode: generalInfo.country,
  };
  generalInfoData.logo = generalInfo.logo?.length
    ? {
        logoId: generalInfo.logo[0]?.attachmentId,
        name: generalInfo.logo[0]?.name,
        type: generalInfo.logo[0]?.type,
      }
    : null;
  return generalInfoData;
};

export const mapBanking = (bankingInfo: Record<string, unknown>) => {
  const bankAccountData: Record<string, unknown> = {};
  bankAccountData.bankName = bankingInfo.bankName;
  bankAccountData.accountNumber = bankingInfo.accountNumber;
  return bankAccountData;
};

export const mapPricing = (pricingInfo: Record<string, unknown>) => {
  const pricingData: Record<string, number> = {};
  pricingData.laPriceChargeable = +pricingInfo.laPriceChargeable!;
  pricingData.frPriceChargeable = +pricingInfo.frPriceChargeable!;
  pricingData.pkPriceChargeable = +pricingInfo.pkPriceChargeable!;
  return pricingData;
};

export const mapBoschConfig = (boschConfigInfo: Record<string, unknown>) => {
  const boschConfigData: Record<string, unknown> = {};
  boschConfigData.biqicName = boschConfigInfo.biqicName;
  boschConfigData.customerCode = boschConfigInfo.customerCode;
  boschConfigData.serviceCenterType = boschConfigInfo.serviceCenterType;
  boschConfigData.laPrice = +boschConfigInfo.laPrice!;
  boschConfigData.frPrice = +boschConfigInfo.frPrice!;
  boschConfigData.pkPrice = +boschConfigInfo.pkPrice!;
  boschConfigData.sparePartsDiscount = +boschConfigInfo.sparePartsDiscount!;
  boschConfigData.accessoriesDiscount = +boschConfigInfo.accessoriesDiscount!;
  boschConfigData.sparePartsIncentive = +boschConfigInfo.sparePartsIncentive!;
  boschConfigData.accessoriesIncentive = +boschConfigInfo.accessoriesIncentive!;
  boschConfigData.packagingCost = +boschConfigInfo.packagingCost!;

  return boschConfigData;
};

export const mapReimbursement = (formValues: Record<string, any>, asc: ServiceCenter) => {
  const reimbursementConfig: ReimbursementConfiguration[] = [];
  asc?.reimbursementConfig?.forEach((config) => {
    const repairName = `reimbursementMethod_${config.category}_repair`;
    const exchangeName = `reimbursementMethod_${config.category}_exchange`;
    reimbursementConfig.push({
      category: config.category,
      reimbursementMethods: {
        REPAIR: formValues[repairName] || config.reimbursementMethods.REPAIR || "",
        EXCHANGE: formValues[exchangeName] || config.reimbursementMethods.EXCHANGE || "",
      },
    });
  });
  return {
    reimbursementConfig,
    reimbursementCreateOn: formValues.reimbursementCreateOn || asc.reimbursementCreateOn,
    reimbursementPeriodType: formValues.reimbursementPeriodType || asc.reimbursementPeriodType,
  };
};

export const mapNotifications = (formValues: Record<string, any>) => {
  const notifications: Record<string, string[]> = {};
  const notification: string[] = [];
  const parentNotification: string[] = [];
  if (formValues.notificationEmail) {
    notification.push("EMAIL");
  }
  if (formValues.notificationSMS) {
    notification.push("SMS");
  }
  if (formValues.parentNotificationEmail) {
    parentNotification.push("EMAIL");
  }
  if (formValues.parentNotificationSMS) {
    parentNotification.push("SMS");
  }

  if (notification.length > 0) {
    notifications.notification = notification;
  } else {
    notifications.notification = [];
  }
  if (parentNotification.length > 0) {
    notifications.parentNotification = parentNotification;
  } else {
    notifications.parentNotification = [];
  }

  return notifications;
};
