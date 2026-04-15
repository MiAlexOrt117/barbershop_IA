declare module "next/link" {
  import type { AnchorHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

  export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    href: string;
    children?: ReactNode;
  }

  export default function Link(props: LinkProps): JSX.Element;
}

declare module "next/navigation" {
  export function usePathname(): string;
}