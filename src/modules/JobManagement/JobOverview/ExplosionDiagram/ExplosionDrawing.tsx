import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { Button, TabNavigation, Tab, Icon, ActivityIndicator } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import "./ExplosionDrawing.scss";
import { SparePartListItem, PositionItem } from "./ExplosionDrawing.types";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import { MaterialItem } from "../../../../hooks/useDiagnosticsManager";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "../../../../types/user.type";
import { getExplosionDrawing } from "../../../../api/services/spareParts/spareParts";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "../../../../utils/queryConstants";
import { MessagesContext } from "../../../../contexts/messagescontext";
import { scrollToTop } from "../../../../utils/scrollToError";

function arePointListsEqual(a?: SparePartListItem[], b?: SparePartListItem[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.partNumber !== y.partNumber ||
      x.position !== y.position ||
      x.highlight !== y.highlight ||
      x.style?.left !== y.style?.left ||
      x.style?.top !== y.style?.top ||
      x.style?.width !== y.style?.width ||
      x.style?.height !== y.style?.height ||
      x.styleTooltip?.left !== y.styleTooltip?.left ||
      x.styleTooltip?.top !== y.styleTooltip?.top ||
      x.styleTooltip?.right !== y.styleTooltip?.right ||
      x.styleTooltip?.height !== y.styleTooltip?.height
    ) {
      return false;
    }
  }
  return true;
}

function deduplicateByPartNumber(items: SparePartListItem[]): SparePartListItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.partNumber)) return false;
    seen.add(item.partNumber);
    return true;
  });
}

interface ExplosionDrawingProps {
  existingMaterials: MaterialItem[];
  onSubmitParts: (positions: PositionItem[]) => void;
  setIsOpen: (value: boolean) => void;
  formValues: Record<string, unknown>;
  isOpen: boolean;
}

const ExplosionDrawing = ({
  existingMaterials,
  onSubmitParts,
  setIsOpen,
  formValues,
  isOpen = false,
}: ExplosionDrawingProps) => {
  const [illustrationPage, setIllustrationPage] = useState<number>(1);
  const queryClient = useQueryClient();
  const countryCode = queryClient.getQueryData<User>(["user"])?.countryCode || "en";
  const partNumber = formValues["baretoolNumber"] as string;
  const brand = formValues["brand"] as string;
  const languageCode = localStorage.getItem("selectedLanguage") || "en";
  const {
    data: illustrationData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["explosionDrawing", partNumber, brand, countryCode, languageCode, illustrationPage],
    queryFn: () =>
      getExplosionDrawing(partNumber, {
        countryCode,
        languageCode,
        brand,
        illustrationPage,
        illustrationType: "E",
      }),
    enabled: isOpen && !!partNumber,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
  });

  const diagnosticItems = useMemo(() => {
    return existingMaterials.map((item) => ({
      position: item.position,
      partNumber: item.partNumber,
      partName: item.description,
      type: item.type,
      positionType: "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }, [existingMaterials]);

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const [selectedSpareParts, setSelectedSpareParts] = useState<SparePartListItem[]>([]);
  const [partsToRemove, setPartsToRemove] = useState<SparePartListItem[]>([]);
  const [pointsPerPage, setPointsPerPage] = useState<Map<number, SparePartListItem[]>>(new Map());
  const imageRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const clickOverlayRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { setMessages } = useContext(MessagesContext);

  // Pre-select parts that are already in the materials list
  useEffect(() => {
    if (diagnosticItems.length > 0 && illustrationData && illustrationData?.list?.length > 0) {
      const alreadySelected = illustrationData.list.filter((part) =>
        diagnosticItems.some((d) => d.partNumber === part.partNumber),
      );
      if (alreadySelected.length > 0) {
        setSelectedSpareParts((prev) => deduplicateByPartNumber([...prev, ...alreadySelected]));
      }
    }
  }, [diagnosticItems, illustrationData]);

  const createPoints = useCallback(
    (
      naturalWidth: number,
      naturalHeight: number,
      renderedWidth: number,
      renderedHeight: number,
      page: number,
    ) => {
      if (illustrationData && !illustrationData.list?.length) {
        return;
      }

      // Filter list items to only include items for the current illustration page
      let pageItems =
        illustrationData?.list.filter((item) => {
          // Check if item has illustrationNumber property and it matches the page
          if (item.illustrationNumber) {
            return item.illustrationNumber === String(page);
          }
          // If no illustrationNumber, include on page 1 only (fallback for test data)
          return page === 1;
        }) || [];

      // If still no items and this is page 1, show all items (backward compatibility)
      if (pageItems.length === 0 && page === 1) {
        pageItems = illustrationData?.list || [];
      }

      // Calculate scale factor
      const scaleX = renderedWidth / naturalWidth;
      const scaleY = renderedHeight / naturalHeight;
      const scale = Math.min(scaleX, scaleY); // Use the smaller scale to ensure fit

      const list = pageItems.map((item) => {
        const offset = 25 * scale;

        // Scale the coordinates from natural size to rendered size
        const posxmax = item.posxmax * scale;
        const posxmin = item.posxmin * scale;
        const posymax = item.posymax * scale;
        const posymin = item.posymin * scale;

        let tooltipHeight = 100;
        let tooltipWidth = 350;

        const tooltip = buildTooltip(tooltipHeight, tooltipWidth);
        tooltipHeight = tooltip.tooltipHeight;
        tooltipWidth = tooltip.tooltipWidth;

        return buildItem(item, {
          posxmax,
          posxmin,
          offset,
          posymax,
          posymin,
          scale,
          tooltipHeight,
          height: renderedHeight,
          width: renderedWidth,
          tooltipWidth,
        });
      });

      setPointsPerPage((prev) => {
        const prevList = prev.get(page);

        // No state change -> no rerender
        if (arePointListsEqual(prevList, list)) {
          return prev;
        }

        const updated = new Map(prev);
        updated.set(page, list);
        return updated;
      });
    },
    [illustrationData],
  );

  const calculateImageAndPoints = useCallback(
    (page: number) => {
      // Only calculate for the active tab
      if (page !== illustrationPage) {
        return;
      }

      const image = imageRefs.current.get(page);
      const clickOverlay = clickOverlayRefs.current.get(page);

      if (!image || !clickOverlay) {
        return;
      }

      // Check if the image's parent container is visible
      const container = image.closest(".explosion-tab-content");
      if (!container?.classList.contains("active")) {
        return;
      }

      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (!naturalWidth || !naturalHeight) {
        return;
      }

      // Wait for layout to complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double-check still active
          if (page !== illustrationPage) return;

          // Get rendered image dimensions
          const renderedWidth = image.clientWidth || image.width;
          const renderedHeight = image.clientHeight || image.height;

          if (renderedWidth && renderedHeight) {
            // With the new structure, overlay is a sibling of the image
            // Just match the image dimensions, no complex positioning needed
            clickOverlay.style.width = `${renderedWidth}px`;
            clickOverlay.style.height = `${renderedHeight}px`;
            clickOverlay.style.position = "absolute";
            clickOverlay.style.top = "0";
            clickOverlay.style.left = "0";
            clickOverlay.style.pointerEvents = "none";

            // Calculate points based on scale for this specific page
            createPoints(naturalWidth, naturalHeight, renderedWidth, renderedHeight, page);
          }
        });
      });
    },
    [illustrationPage, createPoints],
  );

  // Calculate positions for active tab whenever it changes or window resizes
  useEffect(() => {
    let isMounted = true;
    const calculationTimers: ReturnType<typeof setTimeout>[] = [];

    const isImageReady = (page: number): boolean => {
      const img = imageRefs.current.get(page);
      const ovl = clickOverlayRefs.current.get(page);
      return !!(img && ovl && img.clientWidth > 0 && img.clientHeight > 0);
    };

    const scheduleRetry = (attempt: number) => {
      const delays = [300, 250, 300];
      if (attempt >= delays.length || !isMounted) return;
      const timer = setTimeout(() => {
        if (!isMounted) return;
        if (isImageReady(illustrationPage)) {
          calculateImageAndPoints(illustrationPage);
        } else {
          scheduleRetry(attempt + 1);
        }
      }, delays[attempt]);
      calculationTimers.push(timer);
    };

    const performCalculation = () => {
      if (!isMounted) return;
      const timer1 = setTimeout(() => {
        if (!isMounted) return;
        if (isImageReady(illustrationPage)) {
          calculateImageAndPoints(illustrationPage);
        } else {
          scheduleRetry(0);
        }
      }, 300);
      calculationTimers.push(timer1);
    };

    const calculateActiveTab = () => {
      if (!isMounted) return;

      const image = imageRefs.current.get(illustrationPage);
      const overlay = clickOverlayRefs.current.get(illustrationPage);

      if (!image || !overlay) {
        // Retry after a short delay if refs aren't ready
        const retryTimer = setTimeout(() => {
          if (isMounted) calculateActiveTab();
        }, 150);
        calculationTimers.push(retryTimer);
        return;
      }

      if (image.complete && image.naturalWidth > 0) {
        performCalculation();
      } else {
        const handleLoad = () => {
          performCalculation();
          image.removeEventListener("load", handleLoad);
        };
        image.addEventListener("load", handleLoad);
      }
    };

    // Initial calculation with small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (isMounted) calculateActiveTab();
    }, 100);
    calculationTimers.push(initTimer);

    // Recalculate on window resize with debounce
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isMounted) calculateActiveTab();
      }, 200);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      calculationTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [illustrationPage, illustrationData, calculateImageAndPoints]);

  useEffect(() => {
    if (isError) {
      setMessages((prev) => [
        ...prev,
        { text: t("SomethingWentWrong"), type: "error", duration: 5000 },
      ]);
      setIsOpen(false);
      scrollToTop();
    }
  }, [isError, t, setMessages, setIsOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPartSelected = useCallback(
    (partNumber: string) => {
      return selectedSpareParts.some((part) => part.partNumber === partNumber);
    },
    [selectedSpareParts],
  );

  const buildTooltip = (height: number, width: number) => {
    let tooltipHeight = height;
    let tooltipWidth = width;
    if (window.innerWidth < 992) {
      if (window.innerWidth < 500) {
        tooltipHeight = 105;
        tooltipWidth = 300;
      } else if (window.innerWidth < 768 && window.innerWidth > 500) {
        tooltipHeight = 100;
        tooltipWidth = 300;
      } else {
        tooltipHeight = 145;
      }
    }
    return {
      tooltipHeight,
      tooltipWidth,
    };
  };

  const buildItem = (
    item: SparePartListItem,
    {
      posxmax,
      posxmin,
      offset,
      posymax,
      posymin,
      scale,
      tooltipHeight,
      width,
      tooltipWidth,
    }: {
      posxmax: number;
      posxmin: number;
      offset: number;
      posymax: number;
      posymin: number;
      scale: number;
      tooltipHeight: number;
      height: number;
      width: number;
      tooltipWidth: number;
    },
  ) => {
    const newItem = { ...item };
    // Position rectangles relative to the overlay (which is now positioned on the image)
    newItem.style = {
      width: `${posxmax - posxmin + offset}px`,
      height: `${posymax - posymin + offset}px`,
      left: `${posxmin - 5 * scale - 5}px`,
      top: `${posymin - 4 * scale - 5}px`,
    };

    newItem.styleTooltip = {
      left: `${posxmax - posxmin - 15}px`,
      top: `${posymax - posymin + 24}px`,
      height: `${tooltipHeight}px`,
      right: undefined,
    };

    if (width < posxmax + (tooltipWidth + 1)) {
      newItem.styleTooltip.left = "auto";
      newItem.styleTooltip.right = `${-100}px`;
    }
    return newItem;
  };

  const selectDrawingPointOnImage = (point: SparePartListItem) => {
    const selectedIndex = selectedSpareParts.findIndex((p) => p.partNumber === point.partNumber);
    if (selectedIndex === -1) {
      setSelectedSpareParts((prev) => [...prev, point]);
    } else {
      setSelectedSpareParts((prev) => prev.filter((p) => p.partNumber !== point.partNumber));
      setPartsToRemove((prev) => [...prev, point]);
    }
  };

  const submitSelectedParts = () => {
    const removedDiagnosticItems = removeUnselectedPartsFromDiagnosticItems();
    const newPositionItems: PositionItem[] = [
      ...removedDiagnosticItems,
      ...selectedSpareParts.map((p) => {
        const pItem: PositionItem = {
          quantity: p.quantity,
          partName: p.partName,
          partNumber: p.partNumber,
          type: "",
          unitPrice: p.price,
          positionType: "SP",
          position: p.position,
        };
        return pItem;
      }),
    ];

    onSubmitParts(newPositionItems);

    setIsOpen(false);
  };

  const removeUnselectedPartsFromDiagnosticItems = (): PositionItem[] => {
    return diagnosticItems.filter(
      (d) => !(partsToRemove.some((p) => d.partNumber === p.partNumber) && d.type === "SP"),
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="small" />
      </div>
    );
  }

  if (illustrationData) {
    return (
      <div className="explosion-container">
        <div className="explosion-background">
          <div className="explosion-tab-header">
            <TabNavigation
              className="explosion-tab-navigation"
              selectedValue={illustrationPage}
              onTabSelect={(_, data) => setIllustrationPage(data.value as number)}
            >
              {illustrationData?.illustrationList.map((il, ind) => (
                <Tab key={`illustration-${il.page}`} value={il.page}>
                  {t("illustrationType")} {ind + 1}
                </Tab>
              ))}
            </TabNavigation>
            <button
              type="button"
              className="explosion-close-button"
              aria-label={"Close"}
              onClick={() => setIsOpen(false)}
            >
              <Icon iconName={"close"} aria-hidden="true" />
            </button>
          </div>

          {illustrationData?.illustrationList.map((il) => (
            <div
              key={`tab-content-${il.page}`}
              className={`explosion-tab-content ${illustrationPage === il.page ? "active" : ""}`}
            >
              <div className="explosion-image-container">
                <img
                  ref={(el) => {
                    if (el) {
                      imageRefs.current.set(il.page, el);
                      if (il.page === illustrationPage && el.complete && el.naturalWidth > 0) {
                        setTimeout(() => {
                          if (el.clientWidth > 0) {
                            calculateImageAndPoints(il.page);
                          }
                        }, 350);
                      }
                    }
                  }}
                  className="explosion-image-main"
                  src={il.ImagePath}
                  alt={`Explosion diagram ${il.page}`}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (il.page === illustrationPage && img.clientWidth > 0) {
                      setTimeout(() => {
                        calculateImageAndPoints(il.page);
                      }, 350);
                    }
                  }}
                />
                <div
                  className="explosion-image"
                  ref={(el) => {
                    if (el) clickOverlayRefs.current.set(il.page, el);
                  }}
                >
                  {illustrationPage === il.page &&
                    pointsPerPage.get(il.page)?.map((point: SparePartListItem, indexP: number) => {
                      return (
                        <button
                          type="button"
                          key={`${point.partNumber}-${indexP}-${il.page}`}
                          id={`${indexP}`}
                          onClick={() => selectDrawingPointOnImage(point)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectDrawingPointOnImage(point);
                            }
                          }}
                          className={`rectangle rectangle_${point.partNumber} ${
                            isPartSelected(point.partNumber) ? "clicked" : ""
                          } ${point.highlight ? "highlighted" : ""}`}
                          style={point.style || {}}
                        >
                          <span className="point-position-text">{point.position}</span>
                          <div className="tooltip__arrow" />
                          <div className="tooltip" style={point.styleTooltip || {}}>
                            <div>
                              <div className="heading">
                                <span>{point.partName}</span>
                              </div>
                              <p>
                                <span className="small-title">{t("partNumber")}:</span>
                                <span>{point.partNumberFormatted}</span>
                                <br />
                                <span className="small-title">{t("position")}:</span>
                                <span>{point.position}</span>
                                <span className="dot"></span>
                                <span className="small-title">{t("qty")}:</span>
                                <span>{point.quantity}</span>
                                {hasPriceViewPermission && (
                                  <>
                                    <span className="dot"></span>
                                    <span className="small-title">{t("price")}:</span>
                                    <span>{point.price}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="explosion-footer">
          <Button
            onClick={() => setIsOpen(false)}
            className="explosion-cancel-btn"
            mode="secondary"
          >
            {t("cancel")}
          </Button>
          <Button onClick={submitSelectedParts} className="explosion-add-btn" mode="primary">
            {t("add")}
          </Button>
        </div>
      </div>
    );
  }
};

export default ExplosionDrawing;
