import Tile from "@/components/ui/Tile/Tile";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useTranslation } from "react-i18next";

interface TileConfig {
  id: string;
  icon: string;
  value: number;
  label: string;
  permissions?: string[];
  onClick: () => void;
}

function TileWithPermission({
  tile,
}: Readonly<{
  tile: TileConfig;
}>) {
  const hasPermission = useHasPermission(tile.permissions ?? []);

  if (!hasPermission) return null;

  return <Tile icon={tile.icon} value={tile.value} label={tile.label} onClick={tile.onClick} />;
}

export default function DashboardTiles() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const hasASAPermission = useHasPermission(["A_GA"]);

  const tiles: TileConfig[] = [
    {
      id: "activeJobs",
      icon: "box-closed",
      value: 250,
      label: t("activeJobs"),
      permissions: hasASAPermission ? ["A_GA"] : ["OT_V"],
      onClick: () => {},
    },
    {
      id: "openClaims",
      icon: "document",
      value: 32,
      label: t("openClaims"),
      permissions: ["CT_V", "C__V"],
      onClick: () => {},
    },
    {
      id: "activeClients",
      icon: "people",
      value: 314,
      label: t("activeClients"),
      permissions: ["U_AS"],
      onClick: () => {},
    },
    {
      id: "reports",
      icon: "reporting",
      value: 32,
      label: t("reports"),
      permissions: ["RBBC"],
      onClick: () => {},
    },
  ];

  return (
    <div className="dashboard__tiles">
      {tiles.map((tile) => (
        <TileWithPermission key={tile.id} tile={tile} />
      ))}
    </div>
  );
}
