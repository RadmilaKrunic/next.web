export interface NavItem {
  id: number;
  label: string;
  link?: string;
  icon?: string;
  subNavItems?: SubnavItem[];
}

interface SubnavItem {
  id: number;
  label: string;
  link: string;
  icon?: string;
}

interface HelpLink {
  name: string;
  value: string;
}

export interface NavBar {
  sideNavItems: NavItem[];
  helpLink: HelpLink;
}
