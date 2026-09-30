declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare namespace React {
  export type ReactNode =
    | ReactElement<any, any>
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactNode[];

  export interface ReactElement<P = any, T extends string | any = any> {
    type: T;
    props: P;
    key: string | number | null;
  }

  export interface FC<P = {}> {
    (props: P & { key?: any; children?: ReactNode }, context?: any): ReactElement<any, any> | null;
    displayName?: string;
  }

  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };

  export interface FormEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    target: any;
  }

  export interface ChangeEvent<T = any> {
    target: any;
  }

  export interface MouseEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
  }

  export function useState<T>(initialState: T | (() => T)): [T, (action: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: Context<T>): T;

  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
    displayName?: string;
  }

  export function createContext<T>(defaultValue: T): Context<T>;

  export interface CSSProperties {
    [key: string]: any;
  }

  export const Fragment: FC<{ key?: any; children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;

  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
}

declare module 'react' {
  export = React;
  export as namespace React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: any): void;
    unmount(): void;
  }
  export function createRoot(container: any): Root;
}

declare module 'react-router-dom' {
  import { FC, ReactNode } from 'react';

  export interface BrowserRouterProps {
    basename?: string;
    children?: ReactNode;
    key?: any;
  }
  export const BrowserRouter: FC<BrowserRouterProps>;

  export interface RoutesProps {
    children?: ReactNode;
    key?: any;
  }
  export const Routes: FC<RoutesProps>;

  export interface RouteProps {
    path?: string;
    index?: boolean;
    element?: ReactNode;
    key?: any;
  }
  export const Route: FC<RouteProps>;

  export interface NavigateProps {
    to: string;
    replace?: boolean;
    key?: any;
  }
  export const Navigate: FC<NavigateProps>;

  export interface NavLinkProps {
    to: string;
    key?: any;
    className?: string | ((props: { isActive: boolean }) => string);
    children?: ReactNode | ((props: { isActive: boolean }) => ReactNode);
    end?: boolean;
  }
  export const NavLink: FC<NavLinkProps>;

  export function useNavigate(): (to: string, options?: { replace?: boolean }) => void;
  export function useParams<T extends Record<string, string | undefined>>(): T;
  export function useLocation(): { pathname: string; search: string; hash: string; state: any };
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
